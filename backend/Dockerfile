# 使用多阶段构建
FROM maven:3.8.6-openjdk-17 AS builder

# 设置工作目录
WORKDIR /app

# 复制pom.xml和源代码
COPY pom.xml .
COPY src ./src

# 构建应用
RUN mvn clean package -DskipTests

# 运行阶段
FROM openjdk:17-jre-slim

# 安装curl用于健康检查
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# 创建应用用户
RUN groupadd -r ebook && useradd -r -g ebook ebook

# 设置工作目录
WORKDIR /opt/ebook-library

# 创建必要的目录
RUN mkdir -p uploads logs && chown -R ebook:ebook /opt/ebook-library

# 从构建阶段复制JAR文件
COPY --from=builder /app/target/ebook-library-*.jar app.jar

# 切换到应用用户
USER ebook

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/api/test || exit 1

# 启动应用
ENTRYPOINT ["java", "-jar", "-Xmx1g", "-Xms512m", "app.jar"]