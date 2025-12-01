import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from '../ai/ollama.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
const PDFParser = require('pdf2json');

@Injectable()
export class IngestionService {
  private supabase: SupabaseClient;
  private bucketName = 'books';

  constructor(
    private prisma: PrismaService,
    private ollamaService: OllamaService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async uploadToStorage(userId: string, file: Express.Multer.File): Promise<string> {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${userId}/${Date.now()}-${sanitizedFilename}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase Upload Error:', error);
      throw new InternalServerErrorException('Failed to upload file to storage');
    }

    return path;
  }

  async getFileBuffer(storagePath: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(storagePath);

    if (error || !data) throw new NotFoundException('File not found in storage');
    
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getUserUploads(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) return [];
    return this.prisma.uploadedBook.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, status: true, createdAt: true }
    });
  }

  async processFile(
    profileId: string, 
    fileBuffer: Buffer, 
    filename: string, 
    storagePath: string,
    bookId?: string
  ) {
    // 1. Create Record immediately (Status: PROCESSING)
    const uploadedBook = await this.prisma.uploadedBook.create({
      data: {
        profileId,
        title: filename,
        filePath: storagePath,
        status: 'PROCESSING', 
        bookId: bookId || null,
      },
    });

    // 2. Wrap AI processing in a try/catch so it doesn't block reading
    try {
        await this.performAiIngestion(uploadedBook.id, fileBuffer, bookId);
        
        // Success: Mark as fully READY (AI + Reading)
        await this.prisma.uploadedBook.update({
            where: { id: uploadedBook.id },
            data: { status: 'READY' },
        });
    } catch (aiError) {
        console.error('AI Ingestion Failed (Non-fatal):', aiError);
        
        // FALLBACK: Mark as READY anyway so the user can READ the PDF
        // We just won't have vector search for this book.
        await this.prisma.uploadedBook.update({
            where: { id: uploadedBook.id },
            data: { status: 'READY' }, // User can still open the viewer
        });
    }

    return { success: true };
  }

  // --- SEPARATE AI LOGIC ---
  private async performAiIngestion(uploadedBookId: string, fileBuffer: Buffer, bookId?: string) {
      // 1. Parse PDF
      let fullText = await this.parsePdfBuffer(fileBuffer);

      if (!fullText || fullText.trim().length === 0) {
        console.warn(`[Ingestion] No text extracted. Skipping vectorization.`);
        return;
      }

      // 2. Sanity Check
      if (bookId && fullText.length > 500) {
        const targetBook = await this.prisma.book.findUnique({ where: { id: bookId } });
        if (targetBook) {
          const introText = fullText.slice(0, 3000).toLowerCase();
          const cleanTitle = targetBook.title.toLowerCase();
          if (!introText.includes(cleanTitle) && cleanTitle.length > 5) {
             console.warn(`[Ingestion] Content mismatch warning for: ${targetBook.title}`);
          }
        }
      }

      // 3. Chunking & Embedding
      const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
      const chunks = await splitter.createDocuments([fullText]);

      for (const chunk of chunks) {
        if (!chunk.pageContent || chunk.pageContent.trim().length < 10) continue;

        const embedding = await this.ollamaService.generateEmbedding(chunk.pageContent);
        
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "book_chunks" (id, "uploaded_book_id", content, embedding, metadata)
           VALUES ($1, $2, $3, '${JSON.stringify(embedding)}'::vector, $4::jsonb)`,
           crypto.randomUUID(), 
           uploadedBookId,
           chunk.pageContent,
           JSON.stringify(chunk.metadata)
        );
      }
  }

  private parsePdfBuffer(buffer: Buffer): Promise<string> {
    return new Promise((resolve) => {
      const pdfParser = new PDFParser(null, 1);

      // Resolve with empty string on error instead of rejecting
      pdfParser.on("pdfParser_dataError", (errData: any) => {
         console.error("PDF Parse Error (Skipping AI):", errData.parserError);
         resolve(""); 
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          if (!pdfData?.formImage?.Pages) {
            resolve("");
            return;
          }
          const text = pdfData.formImage.Pages.map((page: any) => {
            if (!page.Texts) return "";
            return page.Texts.map((t: any) => {
              if (!t.R?.[0]?.T) return "";
              return decodeURIComponent(t.R[0].T);
            }).join(" ");
          }).join("\n\n");
          
          resolve(text);
        } catch (e) {
          console.error("PDF Structure Error (Skipping AI)", e);
          resolve("");
        }
      });

      try {
        pdfParser.parseBuffer(buffer);
      } catch (e) {
        resolve("");
      }
    });
  }
}