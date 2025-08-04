import {
    formatDate,
    formatFileSize,
    validateEmail,
    validatePassword,
    generateRandomString,
    debounce,
    throttle,
    deepClone,
    isEmptyObject,
    getFileExtension,
    downloadFile,
    formatNumber,
    parseQueryString,
    buildQueryString,
    capitalizeFirstLetter,
    truncateText,
    removeHtmlTags,
    isValidUrl,
    getInitials,
    formatCurrency,
    calculatePercentage,
    sortByKey,
    groupByKey,
    uniqueArray,
    flattenArray,
} from '../helpers';

describe('Helper Functions', () => {
    describe('formatDate', () => {
        test('should format date correctly', () => {
            const date = new Date('2023-12-25T10:30:00Z');
            expect(formatDate(date, 'YYYY-MM-DD')).toBe('2023-12-25');
            expect(formatDate(date, 'DD/MM/YYYY')).toBe('25/12/2023');
            expect(formatDate(date, 'YYYY年MM月DD日')).toBe('2023年12月25日');
        });

        test('should handle string dates', () => {
            expect(formatDate('2023-12-25', 'YYYY-MM-DD')).toBe('2023-12-25');
        });

        test('should handle invalid dates', () => {
            expect(formatDate('invalid-date', 'YYYY-MM-DD')).toBe('Invalid Date');
            expect(formatDate(null, 'YYYY-MM-DD')).toBe('Invalid Date');
        });

        test('should use default format', () => {
            const date = new Date('2023-12-25T10:30:00Z');
            const formatted = formatDate(date);
            expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/);
        });
    });

    describe('formatFileSize', () => {
        test('should format file sizes correctly', () => {
            expect(formatFileSize(1024)).toBe('1.00 KB');
            expect(formatFileSize(1048576)).toBe('1.00 MB');
            expect(formatFileSize(1073741824)).toBe('1.00 GB');
            expect(formatFileSize(500)).toBe('500 B');
        });

        test('should handle decimal places', () => {
            expect(formatFileSize(1536)).toBe('1.50 KB');
            expect(formatFileSize(2621440)).toBe('2.50 MB');
        });

        test('should handle zero and negative values', () => {
            expect(formatFileSize(0)).toBe('0 B');
            expect(formatFileSize(-1024)).toBe('0 B');
        });
    });

    describe('validateEmail', () => {
        test('should validate correct email addresses', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user.name@domain.co.uk')).toBe(true);
            expect(validateEmail('user+tag@example.org')).toBe(true);
        });

        test('should reject invalid email addresses', () => {
            expect(validateEmail('invalid-email')).toBe(false);
            expect(validateEmail('test@')).toBe(false);
            expect(validateEmail('@example.com')).toBe(false);
            expect(validateEmail('')).toBe(false);
            expect(validateEmail(null)).toBe(false);
        });
    });

    describe('validatePassword', () => {
        test('should validate strong passwords', () => {
            expect(validatePassword('Password123!')).toBe(true);
            expect(validatePassword('MySecure@Pass1')).toBe(true);
        });

        test('should reject weak passwords', () => {
            expect(validatePassword('123456')).toBe(false); // Too short
            expect(validatePassword('password')).toBe(false); // No numbers/special chars
            expect(validatePassword('')).toBe(false);
        });
    });

    describe('generateRandomString', () => {
        test('should generate string of specified length', () => {
            expect(generateRandomString(10)).toHaveLength(10);
            expect(generateRandomString(20)).toHaveLength(20);
        });

        test('should generate different strings', () => {
            const str1 = generateRandomString(10);
            const str2 = generateRandomString(10);
            expect(str1).not.toBe(str2);
        });

        test('should contain only alphanumeric characters', () => {
            const str = generateRandomString(100);
            expect(str).toMatch(/^[a-zA-Z0-9]+$/);
        });
    });

    describe('debounce', () => {
        jest.useFakeTimers();

        test('should debounce function calls', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 100);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        test('should pass arguments correctly', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 100);

            debouncedFn('arg1', 'arg2');
            jest.advanceTimersByTime(100);

            expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
        });

        afterEach(() => {
            jest.clearAllTimers();
        });
    });

    describe('throttle', () => {
        jest.useFakeTimers();

        test('should throttle function calls', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);

            throttledFn();
            throttledFn();
            throttledFn();

            expect(mockFn).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(100);
            throttledFn();

            expect(mockFn).toHaveBeenCalledTimes(2);
        });

        afterEach(() => {
            jest.clearAllTimers();
        });
    });

    describe('deepClone', () => {
        test('should deep clone objects', () => {
            const original = {
                a: 1,
                b: {
                    c: 2,
                    d: [3, 4, 5],
                },
            };

            const cloned = deepClone(original);
            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned.b).not.toBe(original.b);
            expect(cloned.b.d).not.toBe(original.b.d);
        });

        test('should handle arrays', () => {
            const original = [1, 2, { a: 3 }];
            const cloned = deepClone(original);

            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned[2]).not.toBe(original[2]);
        });

        test('should handle null and undefined', () => {
            expect(deepClone(null)).toBe(null);
            expect(deepClone(undefined)).toBe(undefined);
        });
    });

    describe('isEmptyObject', () => {
        test('should detect empty objects', () => {
            expect(isEmptyObject({})).toBe(true);
            expect(isEmptyObject({ a: 1 })).toBe(false);
            expect(isEmptyObject(null)).toBe(true);
            expect(isEmptyObject(undefined)).toBe(true);
        });
    });

    describe('getFileExtension', () => {
        test('should extract file extensions', () => {
            expect(getFileExtension('document.pdf')).toBe('pdf');
            expect(getFileExtension('image.jpg')).toBe('jpg');
            expect(getFileExtension('archive.tar.gz')).toBe('gz');
            expect(getFileExtension('noextension')).toBe('');
        });
    });

    describe('formatNumber', () => {
        test('should format numbers with commas', () => {
            expect(formatNumber(1234)).toBe('1,234');
            expect(formatNumber(1234567)).toBe('1,234,567');
            expect(formatNumber(123)).toBe('123');
        });

        test('should handle decimal numbers', () => {
            expect(formatNumber(1234.56)).toBe('1,234.56');
            expect(formatNumber(1234.567, 2)).toBe('1,234.57');
        });
    });

    describe('parseQueryString', () => {
        test('should parse query strings', () => {
            expect(parseQueryString('?a=1&b=2&c=3')).toEqual({
                a: '1',
                b: '2',
                c: '3',
            });

            expect(parseQueryString('a=1&b=2')).toEqual({
                a: '1',
                b: '2',
            });

            expect(parseQueryString('')).toEqual({});
        });

        test('should handle encoded values', () => {
            expect(parseQueryString('name=John%20Doe')).toEqual({
                name: 'John Doe',
            });
        });
    });

    describe('buildQueryString', () => {
        test('should build query strings', () => {
            expect(buildQueryString({ a: '1', b: '2' })).toBe('a=1&b=2');
            expect(buildQueryString({})).toBe('');
        });

        test('should handle special characters', () => {
            expect(buildQueryString({ name: 'John Doe' })).toBe('name=John%20Doe');
        });

        test('should skip null and undefined values', () => {
            expect(buildQueryString({ a: '1', b: null, c: undefined })).toBe('a=1');
        });
    });

    describe('capitalizeFirstLetter', () => {
        test('should capitalize first letter', () => {
            expect(capitalizeFirstLetter('hello')).toBe('Hello');
            expect(capitalizeFirstLetter('HELLO')).toBe('HELLO');
            expect(capitalizeFirstLetter('')).toBe('');
        });
    });

    describe('truncateText', () => {
        test('should truncate long text', () => {
            expect(truncateText('Hello World', 5)).toBe('Hello...');
            expect(truncateText('Hello', 10)).toBe('Hello');
            expect(truncateText('Hello World', 5, '---')).toBe('Hello---');
        });
    });

    describe('removeHtmlTags', () => {
        test('should remove HTML tags', () => {
            expect(removeHtmlTags('<p>Hello <b>World</b></p>')).toBe('Hello World');
            expect(removeHtmlTags('<script>alert("xss")</script>test')).toBe('test');
            expect(removeHtmlTags('No tags here')).toBe('No tags here');
        });
    });

    describe('isValidUrl', () => {
        test('should validate URLs', () => {
            expect(isValidUrl('https://example.com')).toBe(true);
            expect(isValidUrl('http://example.com')).toBe(true);
            expect(isValidUrl('ftp://example.com')).toBe(true);
            expect(isValidUrl('invalid-url')).toBe(false);
            expect(isValidUrl('')).toBe(false);
        });
    });

    describe('getInitials', () => {
        test('should get initials from names', () => {
            expect(getInitials('John Doe')).toBe('JD');
            expect(getInitials('John')).toBe('J');
            expect(getInitials('John Middle Doe')).toBe('JD');
            expect(getInitials('')).toBe('');
        });
    });

    describe('formatCurrency', () => {
        test('should format currency', () => {
            expect(formatCurrency(1234.56)).toBe('¥1,234.56');
            expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
            expect(formatCurrency(1234, 'EUR')).toBe('€1,234.00');
        });
    });

    describe('calculatePercentage', () => {
        test('should calculate percentages', () => {
            expect(calculatePercentage(25, 100)).toBe(25);
            expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 2);
            expect(calculatePercentage(0, 100)).toBe(0);
            expect(calculatePercentage(25, 0)).toBe(0);
        });
    });

    describe('sortByKey', () => {
        test('should sort array by key', () => {
            const data = [
                { name: 'John', age: 30 },
                { name: 'Jane', age: 25 },
                { name: 'Bob', age: 35 },
            ];

            const sortedByAge = sortByKey(data, 'age');
            expect(sortedByAge[0].age).toBe(25);
            expect(sortedByAge[2].age).toBe(35);

            const sortedByName = sortByKey(data, 'name');
            expect(sortedByName[0].name).toBe('Bob');
            expect(sortedByName[2].name).toBe('John');
        });
    });

    describe('groupByKey', () => {
        test('should group array by key', () => {
            const data = [
                { category: 'A', value: 1 },
                { category: 'B', value: 2 },
                { category: 'A', value: 3 },
            ];

            const grouped = groupByKey(data, 'category');
            expect(grouped.A).toHaveLength(2);
            expect(grouped.B).toHaveLength(1);
            expect(grouped.A[0].value).toBe(1);
            expect(grouped.A[1].value).toBe(3);
        });
    });

    describe('uniqueArray', () => {
        test('should remove duplicates from array', () => {
            expect(uniqueArray([1, 2, 2, 3, 3, 4])).toEqual([1, 2, 3, 4]);
            expect(uniqueArray(['a', 'b', 'b', 'c'])).toEqual(['a', 'b', 'c']);
        });

        test('should handle objects with key', () => {
            const data = [
                { id: 1, name: 'John' },
                { id: 2, name: 'Jane' },
                { id: 1, name: 'John' },
            ];

            const unique = uniqueArray(data, 'id');
            expect(unique).toHaveLength(2);
            expect(unique[0].id).toBe(1);
            expect(unique[1].id).toBe(2);
        });
    });

    describe('flattenArray', () => {
        test('should flatten nested arrays', () => {
            expect(flattenArray([1, [2, 3], [4, [5, 6]]])).toEqual([1, 2, 3, 4, 5, 6]);
            expect(flattenArray([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]);
            expect(flattenArray([1, 2, 3])).toEqual([1, 2, 3]);
        });
    });
});