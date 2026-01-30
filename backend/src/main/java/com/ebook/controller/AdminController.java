package com.ebook.controller;

import com.ebook.dto.AdminBookResponse;
import com.ebook.dto.AdminStatsResponse;
import com.ebook.dto.UserResponse;
import com.ebook.entity.Book;
import com.ebook.entity.ReadingProgress;
import com.ebook.entity.User;
import com.ebook.repository.BookRepository;
import com.ebook.repository.ReadingProgressRepository;
import com.ebook.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AdminController {

    @Autowired
    UserRepository userRepository;
    
    @Autowired
    BookRepository bookRepository;
    
    @Autowired
    ReadingProgressRepository readingProgressRepository;
    
    @Autowired
    PasswordEncoder encoder;

    /**
     * Get all users (Admin and Super Admin)
     */
    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepository.findAllByOrderByCreatedAtDesc();
        List<UserResponse> response = users.stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Delete user (Admin and Super Admin, but cannot delete Super Admin)
     */
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication authentication) {
        Optional<User> targetUserOpt = userRepository.findById(id);
        if (!targetUserOpt.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户不存在"));
        }
        
        User targetUser = targetUserOpt.get();
        
        // Cannot delete Super Admin
        if ("ROLE_SUPER_ADMIN".equals(targetUser.getRole())) {
            return ResponseEntity.badRequest().body(Map.of("message", "无法删除超级管理员"));
        }
        
        // Get current user
        User currentUser = userRepository.findByUsername(authentication.getName()).orElse(null);
        
        // Admin cannot delete other Admins, only Super Admin can
        if ("ROLE_ADMIN".equals(targetUser.getRole()) && 
            currentUser != null && "ROLE_ADMIN".equals(currentUser.getRole())) {
            return ResponseEntity.badRequest().body(Map.of("message", "管理员无法删除其他管理员"));
        }
        
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "用户删除成功"));
    }

    /**
     * Update user role (Only Super Admin can promote/demote to Admin)
     */
    @PutMapping("/users/{id}/role")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, 
                                             @RequestBody Map<String, String> request,
                                             Authentication authentication) {
        String newRole = request.get("role");
        
        // Validate role
        List<String> validRoles = Arrays.asList("ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_USER", "ROLE_GUEST");
        if (!validRoles.contains(newRole)) {
            return ResponseEntity.badRequest().body(Map.of("message", "无效的角色"));
        }
        
        Optional<User> targetUserOpt = userRepository.findById(id);
        if (!targetUserOpt.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户不存在"));
        }
        
        User targetUser = targetUserOpt.get();
        User currentUser = userRepository.findByUsername(authentication.getName()).orElse(null);
        
        // Cannot modify Super Admin's role
        if ("ROLE_SUPER_ADMIN".equals(targetUser.getRole())) {
            return ResponseEntity.badRequest().body(Map.of("message", "无法修改超级管理员的角色"));
        }
        
        // Only Super Admin can promote/demote to/from Admin
        if (("ROLE_ADMIN".equals(newRole) || "ROLE_ADMIN".equals(targetUser.getRole())) 
            && (currentUser == null || !"ROLE_SUPER_ADMIN".equals(currentUser.getRole()))) {
            return ResponseEntity.badRequest().body(Map.of("message", "只有超级管理员可以设置管理员角色"));
        }
        
        // Cannot promote to Super Admin
        if ("ROLE_SUPER_ADMIN".equals(newRole)) {
            return ResponseEntity.badRequest().body(Map.of("message", "无法将用户提升为超级管理员"));
        }
        
        targetUser.setRole(newRole);
        userRepository.save(targetUser);
        return ResponseEntity.ok(Map.of("message", "用户角色更新成功", "user", new UserResponse(targetUser)));
    }
    
    /**
     * Get comprehensive admin statistics
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getStats() {
        AdminStatsResponse stats = new AdminStatsResponse();
        
        // Basic counts
        stats.setTotalUsers(userRepository.count());
        stats.setTotalBooks(bookRepository.countAllBooks());
        stats.setTotalReadingProgress(readingProgressRepository.count());
        
        // Users by role
        Map<String, Long> usersByRole = new HashMap<>();
        usersByRole.put("ROLE_SUPER_ADMIN", userRepository.countByRole("ROLE_SUPER_ADMIN"));
        usersByRole.put("ROLE_ADMIN", userRepository.countByRole("ROLE_ADMIN"));
        usersByRole.put("ROLE_USER", userRepository.countByRole("ROLE_USER"));
        usersByRole.put("ROLE_GUEST", userRepository.countByRole("ROLE_GUEST"));
        stats.setUsersByRole(usersByRole);
        
        return ResponseEntity.ok(stats);
    }
    
    /**
     * Get reading volume over time for charts (past 12 months)
     */
    @GetMapping("/stats/reading-volume")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getReadingVolumeOverTime() {
        try {
            List<Object[]> rawData = readingProgressRepository.getMonthlyReadingProgress();
            
            List<Map<String, Object>> chartData = new ArrayList<>();
            for (Object[] row : rawData) {
                Map<String, Object> dataPoint = new HashMap<>();
                dataPoint.put("month", row[0]);
                dataPoint.put("totalProgress", row[1] != null ? ((Number) row[1]).longValue() : 0L);
                chartData.add(dataPoint);
            }
            
            return ResponseEntity.ok(chartData);
        } catch (Exception e) {
            // Fallback with empty data if query fails
            return ResponseEntity.ok(new ArrayList<>());
        }
    }
    
    /**
     * Get all books with user and progress info for admin table (paginated)
     */
    @GetMapping("/books")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getAllBooks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Book> bookPage = bookRepository.findAllBooks(pageable);
        
        List<AdminBookResponse> books = new ArrayList<>();
        for (Book book : bookPage.getContent()) {
            // Get the latest reading progress for this book
            List<ReadingProgress> progressList = readingProgressRepository.findByBookId(book.getId());
            ReadingProgress latestProgress = progressList.isEmpty() ? null : progressList.get(0);
            books.add(new AdminBookResponse(book, latestProgress));
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("books", books);
        response.put("currentPage", bookPage.getNumber());
        response.put("totalItems", bookPage.getTotalElements());
        response.put("totalPages", bookPage.getTotalPages());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get current user's admin info
     */
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getCurrentAdminInfo(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户不存在"));
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("user", new UserResponse(user));
        response.put("isSuperAdmin", "ROLE_SUPER_ADMIN".equals(user.getRole()));
        response.put("isAdmin", "ROLE_ADMIN".equals(user.getRole()) || "ROLE_SUPER_ADMIN".equals(user.getRole()));
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Initialize Super Admin - This endpoint is only available when no Super Admin exists
     * Used for initial system setup
     */
    @PostMapping("/init-super-admin")
    public ResponseEntity<?> initSuperAdmin(@RequestBody Map<String, String> request, Authentication authentication) {
        // Check if a Super Admin already exists
        Long superAdminCount = userRepository.countByRole("ROLE_SUPER_ADMIN");
        if (superAdminCount > 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "超级管理员已存在，无法重复初始化"));
        }
        
        // Get current user (must be logged in)
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        }
        
        User currentUser = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户不存在"));
        }
        
        // Upgrade current user to Super Admin
        currentUser.setRole("ROLE_SUPER_ADMIN");
        userRepository.save(currentUser);
        
        return ResponseEntity.ok(Map.of(
            "message", "超级管理员初始化成功",
            "user", new UserResponse(currentUser)
        ));
    }
    
    /**
     * Check if Super Admin exists (public endpoint for UI to determine setup state)
     */
    @GetMapping("/check-super-admin")
    public ResponseEntity<?> checkSuperAdminExists() {
        Long superAdminCount = userRepository.countByRole("ROLE_SUPER_ADMIN");
        return ResponseEntity.ok(Map.of(
            "exists", superAdminCount > 0,
            "count", superAdminCount
        ));
    }
}
