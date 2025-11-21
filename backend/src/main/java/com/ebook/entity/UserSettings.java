package com.ebook.entity;

import javax.persistence.*;
import javax.validation.constraints.DecimalMax;
import javax.validation.constraints.DecimalMin;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_settings")
public class UserSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;
    
    @Min(12)
    @Max(32)
    @Column(name = "font_size")
    private Integer fontSize = 16;
    
    @Column(name = "theme", length = 20)
    private String theme = "light";
    
    @Column(name = "reading_mode", length = 20)
    private String readingMode = "default";
    
    @DecimalMin("1.0")
    @DecimalMax("3.0")
    @Column(name = "line_height", precision = 3, scale = 1)
    private BigDecimal lineHeight = new BigDecimal("1.5");
    
    @Min(600)
    @Max(1200)
    @Column(name = "page_width")
    private Integer pageWidth = 800;
    
    @Column(name = "auto_save_progress")
    private Boolean autoSaveProgress = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // 构造函数
    public UserSettings() {}
    
    public UserSettings(Long userId) {
        this.userId = userId;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public Integer getFontSize() {
        return fontSize;
    }
    
    public void setFontSize(Integer fontSize) {
        this.fontSize = fontSize;
    }
    
    public String getTheme() {
        return theme;
    }
    
    public void setTheme(String theme) {
        this.theme = theme;
    }
    
    public String getReadingMode() {
        return readingMode;
    }
    
    public void setReadingMode(String readingMode) {
        this.readingMode = readingMode;
    }
    
    public BigDecimal getLineHeight() {
        return lineHeight;
    }
    
    public void setLineHeight(BigDecimal lineHeight) {
        this.lineHeight = lineHeight;
    }
    
    public Integer getPageWidth() {
        return pageWidth;
    }
    
    public void setPageWidth(Integer pageWidth) {
        this.pageWidth = pageWidth;
    }
    
    public Boolean getAutoSaveProgress() {
        return autoSaveProgress;
    }
    
    public void setAutoSaveProgress(Boolean autoSaveProgress) {
        this.autoSaveProgress = autoSaveProgress;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
}