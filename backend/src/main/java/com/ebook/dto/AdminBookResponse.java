package com.ebook.dto;

import com.ebook.entity.Book;
import com.ebook.entity.ReadingProgress;

import java.time.LocalDateTime;

public class AdminBookResponse {
    private Long id;
    private String title;
    private String author;
    private String category;
    private String uploaderUsername;
    private Long uploaderId;
    private String currentChapter;
    private Double readingProgress;
    private LocalDateTime uploadTime;
    private LocalDateTime lastReadTime;
    private String fileType;
    private Long fileSize;
    
    public AdminBookResponse() {}
    
    public AdminBookResponse(Book book, ReadingProgress progress) {
        this.id = book.getId();
        this.title = book.getTitle();
        this.author = book.getAuthor();
        this.category = book.getCategory();
        this.uploaderUsername = book.getUser() != null ? book.getUser().getUsername() : "Unknown";
        this.uploaderId = book.getUser() != null ? book.getUser().getId() : null;
        this.uploadTime = book.getCreatedAt();
        this.fileType = book.getFileType();
        this.fileSize = book.getFileSize();
        
        if (progress != null) {
            this.currentChapter = progress.getCurrentChapter();
            this.readingProgress = progress.getPercentage();
            this.lastReadTime = progress.getUpdatedAt();
        } else {
            this.currentChapter = null;
            this.readingProgress = 0.0;
            this.lastReadTime = null;
        }
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getAuthor() {
        return author;
    }
    
    public void setAuthor(String author) {
        this.author = author;
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }
    
    public String getUploaderUsername() {
        return uploaderUsername;
    }
    
    public void setUploaderUsername(String uploaderUsername) {
        this.uploaderUsername = uploaderUsername;
    }
    
    public Long getUploaderId() {
        return uploaderId;
    }
    
    public void setUploaderId(Long uploaderId) {
        this.uploaderId = uploaderId;
    }
    
    public String getCurrentChapter() {
        return currentChapter;
    }
    
    public void setCurrentChapter(String currentChapter) {
        this.currentChapter = currentChapter;
    }
    
    public Double getReadingProgress() {
        return readingProgress;
    }
    
    public void setReadingProgress(Double readingProgress) {
        this.readingProgress = readingProgress;
    }
    
    public LocalDateTime getUploadTime() {
        return uploadTime;
    }
    
    public void setUploadTime(LocalDateTime uploadTime) {
        this.uploadTime = uploadTime;
    }
    
    public LocalDateTime getLastReadTime() {
        return lastReadTime;
    }
    
    public void setLastReadTime(LocalDateTime lastReadTime) {
        this.lastReadTime = lastReadTime;
    }
    
    public String getFileType() {
        return fileType;
    }
    
    public void setFileType(String fileType) {
        this.fileType = fileType;
    }
    
    public Long getFileSize() {
        return fileSize;
    }
    
    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }
}

