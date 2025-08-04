-- 生产环境数据库初始化脚本

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库 (如果不存在)
CREATE DATABASE IF NOT EXISTS hospital_journal 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE hospital_journal;

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL UNIQUE,
  `role` enum('admin','department_admin','user') NOT NULL DEFAULT 'user',
  `department_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_department_id` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建科室表
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL UNIQUE,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建期刊表
CREATE TABLE IF NOT EXISTS `journals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `issn` varchar(20) DEFAULT NULL,
  `impact_factor` decimal(6,3) NOT NULL DEFAULT '0.000',
  `quartile` enum('Q1','Q2','Q3','Q4') NOT NULL,
  `category` varchar(100) NOT NULL,
  `publisher` varchar(100) DEFAULT NULL,
  `year` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_issn` (`issn`),
  KEY `idx_impact_factor` (`impact_factor`),
  KEY `idx_quartile` (`quartile`),
  KEY `idx_year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建文献表
CREATE TABLE IF NOT EXISTS `publications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL,
  `authors` varchar(1000) NOT NULL,
  `journal_id` int NOT NULL,
  `department_id` int NOT NULL,
  `publish_year` int NOT NULL,
  `volume` varchar(20) DEFAULT NULL,
  `issue` varchar(20) DEFAULT NULL,
  `pages` varchar(50) DEFAULT NULL,
  `doi` varchar(100) DEFAULT NULL,
  `pmid` varchar(20) DEFAULT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_journal_id` (`journal_id`),
  KEY `idx_department_id` (`department_id`),
  KEY `idx_publish_year` (`publish_year`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_doi` (`doi`),
  FULLTEXT KEY `idx_title_authors` (`title`,`authors`),
  CONSTRAINT `fk_publications_journal` FOREIGN KEY (`journal_id`) REFERENCES `journals` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_publications_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_publications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建操作日志表
CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(50) NOT NULL,
  `resource_type` varchar(50) NOT NULL,
  `resource_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_resource_type` (`resource_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_operation_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 添加外键约束
ALTER TABLE `users` ADD CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

-- 插入默认科室数据
INSERT IGNORE INTO `departments` (`name`, `code`, `description`) VALUES
('心内科', 'CARDIO', '心血管内科'),
('神经内科', 'NEURO', '神经内科'),
('呼吸内科', 'RESP', '呼吸内科'),
('消化内科', 'GASTRO', '消化内科'),
('内分泌科', 'ENDO', '内分泌科'),
('肾内科', 'NEPHRO', '肾内科'),
('血液科', 'HEMATO', '血液科'),
('肿瘤科', 'ONCO', '肿瘤科'),
('急诊科', 'EMERG', '急诊科'),
('ICU', 'ICU', '重症监护科');

-- 插入默认管理员用户 (密码: admin123，需要在应用中重新加密)
INSERT IGNORE INTO `users` (`username`, `password`, `email`, `role`) VALUES
('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/hBSJWrOvG', 'admin@hospital.com', 'admin');

-- 设置外键检查
SET FOREIGN_KEY_CHECKS = 1;