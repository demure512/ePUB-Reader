package com.ebook.controller;

import com.ebook.dto.BookResponse;
import com.ebook.dto.ProgressRequest;
import com.ebook.entity.Book;
import com.ebook.service.BookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = "*", maxAge = 3600)
public class BookController {
    
    @Autowired
    private BookService bookService;
    
    @PostMapping("/upload")
    public ResponseEntity<?> uploadBook(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "author", required = false) String author,
            @RequestParam(value = "category", required = false) String category,
            Authentication authentication) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("开始上传文件...");
            System.out.println("文件名: " + file.getOriginalFilename());
            System.out.println("文件大小: " + file.getSize());
            System.out.println("用户: " + authentication.getName());
            
            if (file.isEmpty()) {
                response.put("message", "请选择文件");
                return ResponseEntity.badRequest().body(response);
            }
            
            String filename = file.getOriginalFilename();
            if (filename == null || (!filename.toLowerCase().endsWith(".epub") &&
                                  !filename.toLowerCase().endsWith(".txt"))) {
                response.put("message", "仅支持EPUB、TXT格式");
                return ResponseEntity.badRequest().body(response);
            }
            
            Book book = bookService.uploadBook(file, title, author, category, authentication.getName());
            
            response.put("message", "上传成功");
            response.put("book", new BookResponse(book));
            
            System.out.println("文件上传成功，书籍ID: " + book.getId());
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            System.err.println("IO异常: " + e.getMessage());
            e.printStackTrace();
            response.put("message", "上传失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            System.err.println("其他异常: " + e.getMessage());
            e.printStackTrace();
            response.put("message", "上传失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @GetMapping
    public ResponseEntity<List<BookResponse>> getUserBooks(Authentication authentication) {
        List<BookResponse> books = bookService.getUserBooks(authentication.getName());
        return ResponseEntity.ok(books);
    }
    
    @GetMapping("/category/{category}")
    public ResponseEntity<List<BookResponse>> getBooksByCategory(
            @PathVariable String category,
            Authentication authentication) {
        List<Book> books = bookService.getUserBooksByCategory(authentication.getName(), category);
        List<BookResponse> response = books.stream()
                .map(BookResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getUserCategories(Authentication authentication) {
        List<String> categories = bookService.getUserCategories(authentication.getName());
        return ResponseEntity.ok(categories);
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<BookResponse>> searchBooks(
            @RequestParam String keyword,
            @RequestParam(required = false) String category,
            Authentication authentication) {
        List<Book> books;
        
        if (category != null && !category.trim().isEmpty()) {
            // 在指定分类中搜索
            books = bookService.searchBooksByCategory(authentication.getName(), category, keyword);
        } else {
            // 全局搜索
            books = bookService.searchBooks(authentication.getName(), keyword);
        }
        
        List<BookResponse> response = books.stream()
                .map(BookResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<BookResponse> getBook(@PathVariable Long id, Authentication authentication) {
        Optional<BookResponse> bookResponse = bookService.getBookById(id, authentication.getName());
        return bookResponse.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> updateBook(
            @PathVariable Long id,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "author", required = false) String author,
            @RequestParam(value = "category", required = false) String category,
            Authentication authentication) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Book book = bookService.updateBook(id, title, author, category, authentication.getName());
            response.put("message", "更新成功");
            response.put("book", new BookResponse(book));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("message", "更新失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBook(@PathVariable Long id, Authentication authentication) {
        Map<String, String> response = new HashMap<>();
        
        try {
            boolean deleted = bookService.deleteBook(id, authentication.getName());
            if (deleted) {
                response.put("message", "删除成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("message", "删除失败");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            response.put("message", "删除失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @GetMapping("/download/{id}")
    public ResponseEntity<InputStreamResource> downloadBook(@PathVariable Long id, Authentication authentication) {
        System.out.println("开始下载文件，书籍ID: " + id + ", 用户: " + authentication.getName());
        
        try {
            // We need the book entity for file path, so we use the new authorized method
            Optional<Book> bookOpt = bookService.getAuthorizedBookEntity(id, authentication.getName());
            if (!bookOpt.isPresent()) {
                System.err.println("书籍不存在或用户无权限访问，ID: " + id);
                return ResponseEntity.notFound().build();
            }
            
            Book book = bookOpt.get();
            Path filePath = Paths.get(book.getFilePath());
            
            System.out.println("尝试访问文件: " + filePath.toString());
            
            if (!Files.exists(filePath)) {
                System.err.println("文件不存在: " + filePath.toString());
                return ResponseEntity.notFound().build();
            }
            
            if (!Files.isReadable(filePath)) {
                System.err.println("文件不可读: " + filePath.toString());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            long fileSize = Files.size(filePath);
            System.out.println("文件大小: " + fileSize + " bytes");
            
            FileInputStream fileInputStream = new FileInputStream(filePath.toFile());
            InputStreamResource resource = new InputStreamResource(fileInputStream);
            
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + book.getFileName() + "\"");
            
            // 根据文件类型设置Content-Type
            String contentType = getContentType(book.getFileType());
            headers.add(HttpHeaders.CONTENT_TYPE, contentType);
            
            System.out.println("文件下载成功: " + book.getFileName());
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .contentLength(fileSize)
                    .body(resource);
                    
        } catch (Exception e) {
            System.err.println("下载文件失败: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    private String getContentType(String fileType) {
        if (fileType == null) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        
        switch (fileType.toUpperCase()) {
            case "EPUB":
                return "application/epub+zip";
            case "TXT":
                return "text/plain";
            default:
                return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
    }
    @PostMapping("/{id}/progress")
    public ResponseEntity<?> saveProgress(
            @PathVariable Long id,
            @Valid @RequestBody ProgressRequest progressRequest,
            Authentication authentication) {
        
        try {
            // 获取设备信息（从请求头或用户代理）
            String deviceInfo = getDeviceInfo();
            
            bookService.saveReadingProgress(
                id,
                authentication.getName(),
                progressRequest.getPercentage(),
                progressRequest.getLastLocation(),
                progressRequest.getCurrentChapter(),
                progressRequest.getScrollPosition(),
                progressRequest.getCurrentPage(),
                progressRequest.getTotalPages(),
                deviceInfo
            );
            Map<String, String> response = new HashMap<>();
            response.put("message", "进度保存成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "进度保存失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @GetMapping("/{id}/sync")
    public ResponseEntity<?> syncProgress(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            com.ebook.entity.ReadingProgress progress = bookService.syncReadingProgress(id, authentication.getName());
            if (progress != null) {
                Map<String, Object> response = new HashMap<>();
                response.put("message", "同步成功");
                response.put("progress", progress);
                return ResponseEntity.ok(response);
            } else {
                Map<String, String> response = new HashMap<>();
                response.put("message", "暂无阅读进度");
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "同步失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @GetMapping("/recent")
    public ResponseEntity<List<com.ebook.dto.BookResponse>> getRecentReading(
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {
        
        try {
            List<com.ebook.dto.BookResponse> recentBooks = bookService.getRecentReadingBooks(
                    authentication.getName(), limit);
            return ResponseEntity.ok(recentBooks);
        } catch (Exception e) {
            System.err.println("获取最近阅读失败: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }
    
    private String getDeviceInfo() {
        // 简单的设备信息，可以从请求头获取更详细信息
        return "Web Browser";
    }
}