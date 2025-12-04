package com.ebook.service;

import com.ebook.dto.BookResponse;
import com.ebook.entity.Book;
import com.ebook.entity.ReadingProgress;
import com.ebook.entity.User;
import com.ebook.repository.BookRepository;
import com.ebook.repository.ReadingProgressRepository;
import com.ebook.repository.UserRepository;
import nl.siegmann.epublib.domain.Resource;
import nl.siegmann.epublib.epub.EpubReader;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookService {
    
    private static final Logger logger = LoggerFactory.getLogger(BookService.class);
    
    @Autowired
    private BookRepository bookRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReadingProgressRepository readingProgressRepository;
    
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;
    
    private final Tika tika = new Tika();
    
    public Book uploadBook(MultipartFile file, String title, String author, String category, String username) throws IOException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        // 创建上传目录 - 使用项目根目录的绝对路径
        String projectRoot = System.getProperty("user.dir");
        Path baseUploadPath = Paths.get(projectRoot, uploadDir);
        Path userUploadPath = baseUploadPath.resolve(username);
        
        // 确保目录存在
        if (!Files.exists(baseUploadPath)) {
            Files.createDirectories(baseUploadPath);
            System.out.println("创建基础上传目录: " + baseUploadPath.toString());
        }
        
        if (!Files.exists(userUploadPath)) {
            Files.createDirectories(userUploadPath);
            System.out.println("创建用户上传目录: " + userUploadPath.toString());
        }
        
        // 生成唯一文件名
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            throw new IOException("文件名无效");
        }
        
        String fileExtension = "";
        int lastDotIndex = originalFilename.lastIndexOf(".");
        if (lastDotIndex > 0) {
            fileExtension = originalFilename.substring(lastDotIndex);
        }
        
        String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
        
        // 保存文件
        Path filePath = userUploadPath.resolve(uniqueFilename);
        System.out.println("保存文件到: " + filePath.toString());
        
        try {
            file.transferTo(filePath.toFile());
            System.out.println("文件保存成功");
            
            // 验证文件确实被保存
            if (!Files.exists(filePath)) {
                throw new IOException("文件保存失败：文件不存在");
            }
            
            long savedFileSize = Files.size(filePath);
            System.out.println("保存的文件大小: " + savedFileSize + " bytes");
            
        } catch (Exception e) {
            System.err.println("文件保存失败: " + e.getMessage());
            throw new IOException("文件保存失败: " + e.getMessage(), e);
        }
        
        // 简化文件类型检测，避免使用可能已读取的InputStream
        String fileType = getFileType(file.getContentType(), fileExtension);
        System.out.println("检测到的文件类型: " + fileType);
        
        // 创建书籍记录
        Book book = new Book();
        book.setTitle(title != null && !title.trim().isEmpty() ? title.trim() : originalFilename);
        book.setAuthor(author != null && !author.trim().isEmpty() ? author.trim() : null);
        book.setCategory(category != null && !category.trim().isEmpty() ? category.trim() : null);
        book.setFileName(originalFilename);
        book.setFilePath(filePath.toString());
        book.setFileSize(file.getSize());
        book.setFileType(fileType);
        book.setUser(user);

        // 如果是EPUB，尝试提取元数据和封面
        if ("EPUB".equalsIgnoreCase(fileType)) {
            try (FileInputStream epubInputStream = new FileInputStream(filePath.toFile())) {
                nl.siegmann.epublib.domain.Book epub = (new EpubReader()).readEpub(epubInputStream);
                
                // 提取元数据，但仅在用户未提供相应信息时使用
                nl.siegmann.epublib.domain.Metadata metadata = epub.getMetadata();
                if ((title == null || title.trim().isEmpty()) && metadata.getTitles() != null && !metadata.getTitles().isEmpty()) {
                    book.setTitle(metadata.getTitles().get(0));
                }
                if ((author == null || author.trim().isEmpty()) && metadata.getAuthors() != null && !metadata.getAuthors().isEmpty()) {
                    nl.siegmann.epublib.domain.Author authorInfo = metadata.getAuthors().get(0);
                    book.setAuthor(authorInfo.getFirstname() + " " + authorInfo.getLastname());
                }

                // 提取封面
                Resource coverImage = epub.getCoverImage();
                if (coverImage != null) {
                    String coverPath = saveEpubCover(coverImage, userUploadPath, username);
                    if (coverPath != null) {
                        book.setCoverImage(coverPath.replace('\\', '/'));
                        logger.info("成功提取并设置EPUB封面: {}", coverPath);
                    }
                } else {
                    logger.warn("未能从EPUB文件中提取封面: {}", filePath);
                }
            } catch (Exception e) {
                logger.error("处理EPUB文件时出错: {}", filePath, e);
            }
        }
        
        Book savedBook = bookRepository.save(book);
        System.out.println("书籍记录保存成功，ID: " + savedBook.getId());
        
        return savedBook;
    }
    
    private String getFileType(String mimeType, String fileExtension) {
        // 优先根据文件扩展名判断
        if (fileExtension != null) {
            String ext = fileExtension.toLowerCase();
            if (ext.equals(".epub")) {
                return "EPUB";
            } else if (ext.equals(".txt")) {
                return "TXT";
            }
        }
        
        // 备用：根据MIME类型判断
        if (mimeType != null) {
            String mime = mimeType.toLowerCase();
            if (mime.contains("epub")) {
                return "EPUB";
            } else if (mime.contains("text")) {
                return "TXT";
            }
        }
        
        return "UNKNOWN";
    }
    
    
    public List<BookResponse> getUserBooks(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        List<Book> books = bookRepository.findBooksAndProgressByUser(user);
        
        return books.stream().map(book -> {
            ReadingProgress progress = book.getReadingProgresses().stream()
                .filter(p -> p.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElse(null);
            return new BookResponse(book, progress);
        }).collect(java.util.stream.Collectors.toList());
    }
    
    public List<Book> getUserBooksByCategory(String username, String category) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return bookRepository.findByUserAndCategoryOrderByCreatedAtDesc(user, category);
    }
    
    public List<String> getUserCategories(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return bookRepository.findCategoriesByUser(user);
    }
    
    public List<Book> searchBooks(String username, String keyword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return bookRepository.searchBooks(user, keyword);
    }
    
    public List<Book> searchBooksByCategory(String username, String category, String keyword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        if ("uncategorized".equals(category)) {
            return bookRepository.searchUncategorizedBooks(user, keyword);
        } else {
            return bookRepository.searchBooksByCategory(user, category, keyword);
        }
    }
    
    public Optional<BookResponse> getBookById(Long id, String username) {
        if (username == null || username.trim().isEmpty()) {
            System.err.println("用户名为空");
            return Optional.empty();
        }

        User user = userRepository.findByUsername(username)
                .orElse(null);

        if (user == null) {
            System.err.println("用户不存在: " + username);
            return Optional.empty();
        }

        Optional<Book> bookOpt = bookRepository.findById(id);
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            if (book.getUser().getId().equals(user.getId())) {
                ReadingProgress progress = readingProgressRepository.findByUserAndBook(user, book)
                        .orElse(null);
                BookResponse response = new BookResponse(book, progress);
                return Optional.of(response);
            } else {
                System.err.println("用户无权限访问书籍，书籍ID: " + id + ", 用户: " + username);
            }
        } else {
            System.err.println("书籍不存在，ID: " + id);
        }

        return Optional.empty();
    }
    
    public Optional<Book> getAuthorizedBookEntity(Long id, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        return bookRepository.findById(id)
                .filter(book -> book.getUser().getId().equals(user.getId()));
    }

    public boolean deleteBook(Long id, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        Optional<Book> bookOpt = bookRepository.findById(id);
        if (bookOpt.isPresent() && bookOpt.get().getUser().getId().equals(user.getId())) {
            Book book = bookOpt.get();
            
            // 1. 删除文件
            try {
                Path filePath = Paths.get(book.getFilePath());
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                    System.out.println("删除文件: " + filePath.toString());
                }
            } catch (IOException e) {
                System.err.println("删除文件失败: " + e.getMessage());
                // 不抛出异常，继续删除数据库记录
            }
            
            // 2. 删除书籍记录 (ReadingProgress 会被级联删除)
            bookRepository.delete(book);
            return true;
        }
        return false;
    }
    
    public Book updateBook(Long id, String title, String author, String category, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        Optional<Book> bookOpt = bookRepository.findById(id);
        if (bookOpt.isPresent() && bookOpt.get().getUser().getId().equals(user.getId())) {
            Book book = bookOpt.get();
            book.setTitle(title);
            book.setAuthor(author);
            book.setCategory(category);
            return bookRepository.save(book);
        }
        throw new RuntimeException("书籍不存在或无权限");
    }
    public void saveReadingProgress(Long bookId, String username, double percentage, String lastLocation) {
        saveReadingProgress(bookId, username, percentage, lastLocation, null, null, null, null, null);
    }
    
    /**
     * 保存阅读进度（支持多设备同步）
     */
    public void saveReadingProgress(Long bookId, String username, double percentage, String lastLocation,
                                  String currentChapter, Integer scrollPosition, Integer currentPage, Integer totalPages, String deviceInfo) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在: " + username));
        
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("书籍不存在: " + bookId));

        if (!book.getUser().getId().equals(user.getId())) {
            throw new SecurityException("用户无权限访问此书籍");
        }

        ReadingProgress progress = readingProgressRepository.findByUserAndBook(user, book)
                .orElse(new ReadingProgress());

        progress.setUser(user);
        progress.setBook(book);
        progress.setPercentage(percentage);
        progress.setLastLocation(lastLocation);
        
        // 设置新的同步字段
        if (currentChapter != null) {
            progress.setCurrentChapter(currentChapter);
        }
        if (scrollPosition != null) {
            progress.setScrollPosition(scrollPosition);
        }
        if (currentPage != null) {
            progress.setCurrentPage(currentPage);
        }
        if (totalPages != null) {
            progress.setTotalPages(totalPages);
        }
        if (deviceInfo != null) {
            progress.setDeviceInfo(deviceInfo);
        }
        
        // 计算并保存 progress_percentage（百分比形式）
        if (percentage >= 0) {
            progress.setProgressPercentage(percentage);
        }

        readingProgressRepository.save(progress);
        logger.info("用户 {} 的书籍 {} 阅读进度已保存: {}% (页码: {}/{}, 设备: {})", 
                   username, bookId, percentage, currentPage, totalPages, deviceInfo);
    }
    
    /**
     * 获取用户最近阅读的书籍
     */
    public List<BookResponse> getRecentReadingBooks(String username, int limit) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在: " + username));
        
        List<ReadingProgress> recentProgress = readingProgressRepository
                .findByUserOrderByLastSyncTimeDescUpdatedAtDesc(user)
                .stream()
                .limit(limit)
                .collect(java.util.stream.Collectors.toList());
        
        return recentProgress.stream()
                .map(progress -> new BookResponse(progress.getBook(), progress))
                .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * 同步阅读进度（用于多设备同步）
     */
    public ReadingProgress syncReadingProgress(Long bookId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在: " + username));
        
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("书籍不存在: " + bookId));

        if (!book.getUser().getId().equals(user.getId())) {
            throw new SecurityException("用户无权限访问此书籍");
        }

        return readingProgressRepository.findByUserAndBook(user, book)
                .orElse(null);
    }

    private String saveEpubCover(Resource coverImage, Path userUploadPath, String username) throws IOException {
        String coverFilename = "cover-" + UUID.randomUUID().toString() + "." + getFileExtensionFromMediaType(coverImage.getMediaType().getName());
        Path coverOutputPath = userUploadPath.resolve(coverFilename);
        
        try (FileOutputStream fos = new FileOutputStream(coverOutputPath.toFile())) {
            fos.write(coverImage.getData());
        }
        
        // 返回相对路径: uploads/username/cover-uuid.jpg
        return Paths.get(uploadDir, username, coverFilename).toString();
    }
    
    private String getFileExtensionFromMediaType(String mediaType) {
        if (mediaType == null) {
            return "jpg"; // 默认
        }
        switch (mediaType.toLowerCase()) {
            case "image/jpeg":
                return "jpg";
            case "image/png":
                return "png";
            case "image/gif":
                return "gif";
            default:
                return "jpg";
        }
    }
}