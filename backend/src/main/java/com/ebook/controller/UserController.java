package com.ebook.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserController {
    
    @GetMapping("/verify")
    public ResponseEntity<?> verifyToken(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        
        if (authentication != null && authentication.isAuthenticated()) {
            response.put("message", "Token有效");
            response.put("username", authentication.getName());
            return ResponseEntity.ok(response);
        } else {
            response.put("message", "Token无效");
            return ResponseEntity.status(401).body(response);
        }
    }
}