import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from '../ai/ollama.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'; // Fixed import

// Use this specific syntax to match the "export = PDFParse" in our d.ts file
import pdf = require('pdf-parse'); 

@Injectable()
export class IngestionService {
  constructor(
    private prisma: PrismaService,
    private ollamaService: OllamaService,
  ) {}

  async processFile(profileId: string, fileBuffer: Buffer, filename: string) {
    // 1. Create Upload Record
    const uploadedBook = await this.prisma.uploadedBook.create({
      data: {
        profileId,
        title: filename,
        filePath: `uploads/${filename}`, // Mock path for this stage
        status: 'PROCESSING',
      },
    });

    try {
      // 2. Parse PDF
      // Now TypeScript knows 'pdf' is a function that returns a Promise
      const pdfData = await pdf(fileBuffer);
      const fullText = pdfData.text;

      // 3. Chunking
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const chunks = await splitter.createDocuments([fullText]);

      // 4. Embed & Save Loop
      for (const chunk of chunks) {
        // Generate embedding from Ollama
        const embedding = await this.ollamaService.generateEmbedding(chunk.pageContent);
        
        // Save to DB using raw SQL for vector support
        // We cast parameters to ensure PostgreSQL understands the vector type
        await this.prisma.$executeRaw`
          INSERT INTO "book_chunks" (id, "uploaded_book_id", content, embedding, metadata)
          VALUES (
            gen_random_uuid(), 
            ${uploadedBook.id}, 
            ${chunk.pageContent}, 
            ${embedding}::vector, 
            ${JSON.stringify(chunk.metadata)}::jsonb
          )
        `;
      }

      // 5. Update Status to READY
      await this.prisma.uploadedBook.update({
        where: { id: uploadedBook.id },
        data: { status: 'READY' },
      });

      return { success: true, chunksProcessed: chunks.length };

    } catch (error) {
      console.error('Ingestion Error:', error);
      
      // Update Status to ERROR on failure
      await this.prisma.uploadedBook.update({
        where: { id: uploadedBook.id },
        data: { status: 'ERROR' },
      });
      
      throw error;
    }
  }
}