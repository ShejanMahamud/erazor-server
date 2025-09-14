import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        return this.sanitize(value);
    }

    private sanitize(input: any): any {
        if (typeof input === 'string') {
            // Remove HTML tags using regex and decode HTML entities
            let sanitized = input
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/&[#\w]+;/g, '') // Remove HTML entities
                .trim();

            return sanitized; // ✅ removes HTML tags and entities safely
        }

        if (Array.isArray(input)) {
            return input.map((item) => this.sanitize(item));
        }

        if (input && typeof input === 'object') {
            const sanitizedObject: Record<string, any> = {};
            for (const [key, val] of Object.entries(input)) {
                sanitizedObject[key] = this.sanitize(val);
            }
            return sanitizedObject;
        }

        return input;
    }
}
