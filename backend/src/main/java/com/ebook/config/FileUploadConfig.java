package com.ebook.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class FileUploadConfig {
    
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;
    
    @Bean
    CommandLineRunner initUploadDirectory() {
        return args -> {
            try {
                // 获取项目根目录
                String projectRoot = System.getProperty("user.dir");
                Path uploadPath = Paths.get(projectRoot, uploadDir);
                
                // 创建上传目录
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                    System.out.println("✅ 创建上传目录: " + uploadPath.toString());
                } else {
                    System.out.println("✅ 上传目录已存在: " + uploadPath.toString());
                }
                
                // 设置目录权限（如果是Windows系统，这个操作可能会失败，但不影响功能）
                try {
                    uploadPath.toFile().setReadable(true, false);
                    uploadPath.toFile().setWritable(true, false);
                    uploadPath.toFile().setExecutable(true, false);
                } catch (Exception e) {
                    System.out.println("⚠️  设置目录权限失败（Windows系统正常）: " + e.getMessage());
                }
                
            } catch (Exception e) {
                System.err.println("❌ 初始化上传目录失败: " + e.getMessage());
                e.printStackTrace();
            }
        };
    }
}