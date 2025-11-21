package com.ebook.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*", maxAge = 3600)
public class TestController {
    
    @GetMapping("/hello")
    public ResponseEntity<Map<String, String>> hello() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Hello from TestController!");
        response.put("status", "success");
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/user-settings-test")
    public ResponseEntity<Map<String, String>> userSettingsTest() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "UserSettings endpoint is working!");
        response.put("path", "/api/user/settings");
        return ResponseEntity.ok(response);
    }
}