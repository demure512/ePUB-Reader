package com.ebook.dto;

import javax.validation.constraints.NotNull;

public class ProgressRequest {

    @NotNull
    private Double percentage;

    private String lastLocation;
    
    private String currentChapter;
    
    private Integer scrollPosition;
    
    private Integer totalPages;

    public Double getPercentage() {
        return percentage;
    }

    public void setPercentage(Double percentage) {
        this.percentage = percentage;
    }

    public String getLastLocation() {
        return lastLocation;
    }

    public void setLastLocation(String lastLocation) {
        this.lastLocation = lastLocation;
    }
    
    public String getCurrentChapter() {
        return currentChapter;
    }
    
    public void setCurrentChapter(String currentChapter) {
        this.currentChapter = currentChapter;
    }
    
    public Integer getScrollPosition() {
        return scrollPosition;
    }
    
    public void setScrollPosition(Integer scrollPosition) {
        this.scrollPosition = scrollPosition;
    }
    
    public Integer getTotalPages() {
        return totalPages;
    }
    
    public void setTotalPages(Integer totalPages) {
        this.totalPages = totalPages;
    }
}