import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { sanitize } from 'string-sanitizer';

@Injectable()
export class SanitizePipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        return this.sanitize(value);
    }

    private sanitize(input: any): any {
        if (typeof input === 'string') {
            // Remove HTML tags using regex, then sanitize special characters
            const withoutHTML = input.replace(/<[^>]*>/g, '');
            return sanitize(withoutHTML.trim()); // ✅ removes HTML tags and special characters
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
