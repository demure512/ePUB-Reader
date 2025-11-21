package com.ebook.controller;

import com.ebook.entity.UserSettings;
import com.ebook.service.UserSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user/settings")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserSettingsController {
    
    @Autowired
    private UserSettingsService userSettingsService;
    
    /**
     * 获取用户设置
     */
    @GetMapping
    public ResponseEntity<UserSettings> getUserSettings(Authentication authentication) {
        try {
            UserSettings settings = userSettingsService.getUserSettings(authentication.getName());
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            System.err.println("获取用户设置失败: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
    
    /**
     * 更新用户设置
     */
    @PutMapping
    public ResponseEntity<?> updateUserSettings(
            @Valid @RequestBody UserSettings settings,
            Authentication authentication) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            UserSettings updatedSettings = userSettingsService.updateUserSettings(
                    authentication.getName(), settings);
            
            response.put("message", "设置更新成功");
            response.put("settings", updatedSettings);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("更新用户设置失败: " + e.getMessage());
            e.printStackTrace();
            response.put("message", "设置更新失败: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * 更新单个设置项
     */
    @PutMapping("/{key}")
    public ResponseEntity<?> updateSingleSetting(
            @PathVariable String key,
            @RequestBody Map<String, Object> requestBody,
            Authentication authentication) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Object value = requestBody.get("value");
            if (value == null) {
                response.put("message", "缺少value参数");
                return ResponseEntity.badRequest().body(response);
            }
            
            UserSettings updatedSettings = userSettingsService.updateSingleSetting(
                    authentication.getName(), key, value);
            
            response.put("message", "设置更新成功");
            response.put("settings", updatedSettings);
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            System.err.println("更新单个设置失败: " + e.getMessage());
            e.printStackTrace();
            response.put("message", "设置更新失败: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * 重置用户设置为默认值
     */
    @PostMapping("/reset")
    public ResponseEntity<?> resetUserSettings(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            UserSettings defaultSettings = userSettingsService.resetUserSettings(authentication.getName());
            
            response.put("message", "设置已重置为默认值");
            response.put("settings", defaultSettings);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("重置用户设置失败: " + e.getMessage());
            e.printStackTrace();
            response.put("message", "重置设置失败: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * 检查用户是否有设置
     */
    @GetMapping("/exists")
    public ResponseEntity<Map<String, Boolean>> checkUserSettingsExists(Authentication authentication) {
        Map<String, Boolean> response = new HashMap<>();
        
        try {
            boolean exists = userSettingsService.hasUserSettings(authentication.getName());
            response.put("exists", exists);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("检查用户设置失败: " + e.getMessage());
            e.printStackTrace();
            response.put("exists", false);
            return ResponseEntity.ok(response);
        }
    }
    
    /**
     * 获取设置的默认值
     */
    @GetMapping("/defaults")
    public ResponseEntity<Map<String, Object>> getDefaultSettings() {
        Map<String, Object> defaults = new HashMap<>();
        defaults.put("fontSize", 16);
        defaults.put("theme", "light");
        defaults.put("readingMode", "default");
        defaults.put("lineHeight", 1.5);
        defaults.put("pageWidth", 800);
        defaults.put("autoSaveProgress", true);
        
        return ResponseEntity.ok(defaults);
    }
}