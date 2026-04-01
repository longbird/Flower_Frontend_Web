CREATE TABLE IF NOT EXISTS external_photos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source      VARCHAR(30)   NOT NULL COMMENT '468 | ebestflower',
  post_id     VARCHAR(50)   NOT NULL COMMENT 'Original post ID from source site',
  title       VARCHAR(255)  DEFAULT NULL,
  image_url   VARCHAR(500)  NOT NULL,
  post_url    VARCHAR(500)  DEFAULT NULL,
  author      VARCHAR(100)  DEFAULT NULL,
  posted_at   DATETIME      DEFAULT NULL COMMENT 'Original post date on source site',
  scraped_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_source_image (source, image_url(200))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
