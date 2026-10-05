/**
 * util/Validation.java equivalent
 * Centralized business input validation helper
 */
export class Validation {
  public static validateNonEmpty(input: string, fieldName: string): string {
    if (!input || input.trim().length === 0) {
      throw new Error(`${fieldName} cannot be empty.`);
    }
    return input.trim();
  }

  public static validateUsername(username: string): string {
    const trimmed = this.validateNonEmpty(username, 'Username');
    if (trimmed.length < 3) {
      throw new Error('Username must be at least 3 characters long.');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      throw new Error('Username can only contain alphanumeric characters and underscores.');
    }
    return trimmed.toLowerCase();
  }

  public static validatePassword(password: string): string {
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }
    return password;
  }

  public static validateRating(rating: number): number {
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new Error('Rating score must be an integer or decimal between 1 and 5 stars.');
    }
    return Math.round(rating * 10) / 10;
  }

  public static validatePositiveAmount(amount: number, fieldName: string = 'Amount'): number {
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`${fieldName} must be a positive number.`);
    }
    return amount;
  }
}
