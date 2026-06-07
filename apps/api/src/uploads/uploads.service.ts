import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { extname, join } from "path";
import type { MediaType } from "@trustlayer/shared";

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly uploadsDir = join(process.cwd(), "uploads");

  constructor() {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async saveUploadedFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ url: string; mediaType: MediaType }> {
    const mediaType = this.resolveMediaType(file.mimetype);
    const maxBytes = mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(
        mediaType === "image"
          ? "Images must be 10 MB or smaller"
          : "Videos must be 25 MB or smaller",
      );
    }

    const ext = extname(file.originalname).toLowerCase();
    const safeExt =
      mediaType === "image"
        ? [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)
          ? ext
          : ".jpg"
        : [".mp4", ".webm", ".mov"].includes(ext)
          ? ext
          : ".mp4";

    const filename = `${userId}-${randomUUID()}${safeExt}`;
    const destination = join(this.uploadsDir, filename);

    await writeFile(destination, file.buffer);

    const baseUrl = process.env.API_PUBLIC_URL ?? "http://localhost:4000";
    return {
      url: `${baseUrl}/api/uploads/${filename}`,
      mediaType,
    };
  }

  private resolveMediaType(mime: string): MediaType {
    if (IMAGE_MIME.has(mime)) return "image";
    if (VIDEO_MIME.has(mime)) return "video";
    throw new BadRequestException("Unsupported file type");
  }
}
