import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { stripTags } from 'string-sanitizer';

@Injectable()
export class SanitizePipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        return this.sanitize(value);
    }

    private sanitize(input: any): any {
        if (typeof input === 'string') {
            // Trim whitespace and strip HTML tags
            return stripTags(input.trim());
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

        return input; // numbers, booleans, null, undefined
    }
}
