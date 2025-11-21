package com.ebook.service;

import com.ebook.entity.UserSettings;
import com.ebook.repository.UserSettingsRepository;
import com.ebook.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Service
@Transactional
public class UserSettingsService {
    
    @Autowired
    private UserSettingsRepository userSettingsRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * 获取用户设置，如果不存在则创建默认设置
     */
    public UserSettings getUserSettings(String username) {
        Long userId = getUserIdByUsername(username);
        Optional<UserSettings> settings = userSettingsRepository.findByUserId(userId);
        
        if (settings.isPresent()) {
            return settings.get();
        } else {
            // 创建默认设置
            return createDefaultSettings(userId);
        }
    }
    
    /**
     * 更新用户设置
     */
    public UserSettings updateUserSettings(String username, UserSettings newSettings) {
        Long userId = getUserIdByUsername(username);
        Optional<UserSettings> existingSettings = userSettingsRepository.findByUserId(userId);
        
        UserSettings settings;
        if (existingSettings.isPresent()) {
            settings = existingSettings.get();
        } else {
            settings = new UserSettings(userId);
        }
        
        // 更新设置值
        if (newSettings.getFontSize() != null) {
            settings.setFontSize(newSettings.getFontSize());
        }
        if (newSettings.getTheme() != null) {
            settings.setTheme(newSettings.getTheme());
        }
        if (newSettings.getReadingMode() != null) {
            settings.setReadingMode(newSettings.getReadingMode());
        }
        if (newSettings.getLineHeight() != null) {
            settings.setLineHeight(newSettings.getLineHeight());
        }
        if (newSettings.getPageWidth() != null) {
            settings.setPageWidth(newSettings.getPageWidth());
        }
        if (newSettings.getAutoSaveProgress() != null) {
            settings.setAutoSaveProgress(newSettings.getAutoSaveProgress());
        }
        
        return userSettingsRepository.save(settings);
    }
    
    /**
     * 重置用户设置为默认值
     */
    public UserSettings resetUserSettings(String username) {
        Long userId = getUserIdByUsername(username);
        
        // 删除现有设置
        userSettingsRepository.deleteByUserId(userId);
        
        // 创建默认设置
        return createDefaultSettings(userId);
    }
    
    /**
     * 更新单个设置项
     */
    public UserSettings updateSingleSetting(String username, String key, Object value) {
        UserSettings settings = getUserSettings(username);
        
        switch (key) {
            case "fontSize":
                settings.setFontSize((Integer) value);
                break;
            case "theme":
                settings.setTheme((String) value);
                break;
            case "readingMode":
                settings.setReadingMode((String) value);
                break;
            case "lineHeight":
                settings.setLineHeight(new BigDecimal(value.toString()));
                break;
            case "pageWidth":
                settings.setPageWidth((Integer) value);
                break;
            case "autoSaveProgress":
                settings.setAutoSaveProgress((Boolean) value);
                break;
            default:
                throw new IllegalArgumentException("未知的设置项: " + key);
        }
        
        return userSettingsRepository.save(settings);
    }
    
    /**
     * 创建默认设置
     */
    private UserSettings createDefaultSettings(Long userId) {
        UserSettings settings = new UserSettings(userId);
        settings.setFontSize(16);
        settings.setTheme("light");
        settings.setReadingMode("default");
        settings.setLineHeight(new BigDecimal("1.5"));
        settings.setPageWidth(800);
        settings.setAutoSaveProgress(true);
        
        return userSettingsRepository.save(settings);
    }
    
    /**
     * 根据用户名获取用户ID
     */
    private Long getUserIdByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户不存在: " + username))
                .getId();
    }
    
    /**
     * 检查用户是否有设置
     */
    public boolean hasUserSettings(String username) {
        Long userId = getUserIdByUsername(username);
        return userSettingsRepository.existsByUserId(userId);
    }
}