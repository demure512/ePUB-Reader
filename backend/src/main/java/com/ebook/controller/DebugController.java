package com.ebook.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/debug")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DebugController {
    
    @PostMapping("/upload-test")
    public ResponseEntity<?> testUpload(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== 文件上传测试 ===");
            System.out.println("用户: " + (authentication != null ? authentication.getName() : "未认证"));
            System.out.println("文件名: " + file.getOriginalFilename());
            System.out.println("文件大小: " + file.getSize());
            System.out.println("文件类型: " + file.getContentType());
            System.out.println("是否为空: " + file.isEmpty());
            
            // 测试文件扩展名检测
            String filename = file.getOriginalFilename();
            String extension = "";
            if (filename != null && filename.lastIndexOf(".") > 0) {
                extension = filename.substring(filename.lastIndexOf("."));
            }
            System.out.println("文件扩展名: " + extension);
            
            response.put("message", "测试成功");
            response.put("filename", file.getOriginalFilename());
            response.put("size", file.getSize());
            response.put("contentType", file.getContentType());
            response.put("extension", extension);
            response.put("user", authentication != null ? authentication.getName() : "未认证");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("测试失败: " + e.getMessage());
            e.printStackTrace();
            response.put("message", "测试失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @PostMapping("/register-test")
    public ResponseEntity<?> testRegister(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== 注册测试 ===");
            System.out.println("请求数据: " + request);
            
            String username = (String) request.get("username");
            String password = (String) request.get("password");
            String email = (String) request.get("email");
            
            System.out.println("用户名: " + username);
            System.out.println("密码: " + password);
            System.out.println("邮箱: " + email);
            
            // 验证基本信息
            if (username == null || username.trim().isEmpty()) {
                response.put("message", "用户名不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (password == null || password.trim().isEmpty()) {
                response.put("message", "密码不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            response.put("message", "注册测试成功");
            response.put("username", username);
            response.put("email", email);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("注册测试失败: " + e.getMessage());
            e.printStackTrace();
            response.put("message", "注册测试失败: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @GetMapping("/auth-test")
    public ResponseEntity<?> testAuth(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        
        System.out.println("=== 认证测试 ===");
        System.out.println("Authentication: " + authentication);
        System.out.println("用户: " + (authentication != null ? authentication.getName() : "未认证"));
        
        response.put("authenticated", authentication != null);
        response.put("user", authentication != null ? authentication.getName() : null);
        
        return ResponseEntity.ok(response);
    }
}