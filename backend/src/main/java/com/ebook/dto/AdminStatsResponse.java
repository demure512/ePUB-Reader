package com.ebook.dto;

import java.util.List;
import java.util.Map;

public class AdminStatsResponse {
    private Long totalUsers;
    private Long totalBooks;
    private Long totalReadingProgress;
    private List<Map<String, Object>> readingVolumeOverTime;
    private Map<String, Long> usersByRole;
    
    public AdminStatsResponse() {}
    
    public Long getTotalUsers() {
        return totalUsers;
    }
    
    public void setTotalUsers(Long totalUsers) {
        this.totalUsers = totalUsers;
    }
    
    public Long getTotalBooks() {
        return totalBooks;
    }
    
    public void setTotalBooks(Long totalBooks) {
        this.totalBooks = totalBooks;
    }
    
    public Long getTotalReadingProgress() {
        return totalReadingProgress;
    }
    
    public void setTotalReadingProgress(Long totalReadingProgress) {
        this.totalReadingProgress = totalReadingProgress;
    }
    
    public List<Map<String, Object>> getReadingVolumeOverTime() {
        return readingVolumeOverTime;
    }
    
    public void setReadingVolumeOverTime(List<Map<String, Object>> readingVolumeOverTime) {
        this.readingVolumeOverTime = readingVolumeOverTime;
    }
    
    public Map<String, Long> getUsersByRole() {
        return usersByRole;
    }
    
    public void setUsersByRole(Map<String, Long> usersByRole) {
        this.usersByRole = usersByRole;
    }
}

