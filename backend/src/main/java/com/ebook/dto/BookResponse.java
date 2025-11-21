package com.ebook.dto;

import com.ebook.entity.Book;
import com.ebook.entity.ReadingProgress;
import java.time.LocalDateTime;

public class BookResponse {
    private Long id;
    private String title;
    private String author;
    private String description;
    private String fileName;
    private Long fileSize;
    private String fileType;
    private String category;
    private String coverImage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private double percentage;
    private String lastLocation;
    
    public BookResponse() {}
    
    public BookResponse(Book book) {
        this.id = book.getId();
        this.title = book.getTitle();
        this.author = book.getAuthor();
        this.description = book.getDescription();
        this.fileName = book.getFileName();
        this.fileSize = book.getFileSize();
        this.fileType = book.getFileType();
        this.category = book.getCategory();
        this.coverImage = book.getCoverImage();
        this.createdAt = book.getCreatedAt();
        this.updatedAt = book.getUpdatedAt();
    }

    public BookResponse(Book book, ReadingProgress progress) {
        this(book);
        if (progress != null) {
            this.percentage = progress.getPercentage();
            // 确保 lastLocation 为 null 时不会传递字符串 "null"
            this.lastLocation = progress.getLastLocation();
        } else {
            this.percentage = 0;
            this.lastLocation = null;
        }
    }

    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }

    public String getLastLocation() { return lastLocation; }
    public void setLastLocation(String lastLocation) { this.lastLocation = lastLocation; }
}