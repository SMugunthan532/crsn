/**
 * model/User.java equivalent
 * Demonstrates Encapsulation (private fields, public getters/setters),
 * Running average calculation, and account state tracking.
 */
import { UserDTO } from '../../types';

export class User {
  private static idCounter: number = 100;

  private userId: string;
  private name: string;
  private username: string;
  private passwordHash: string;
  private locality: string;
  private ratingAverage: number;
  private ratingCount: number;
  private finesOwed: number;
  private finesPaid: number;
  private joinedDate: string;

  private email: string;
  private phone?: string;
  private isVerified: boolean;
  private emailVerified: boolean;
  private idVerificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED';
  private idDocumentType?: 'Driver License' | 'Passport' | 'Utility Bill' | 'Community ID';
  private verificationDate?: string;
  private extraProofDetails?: string;
  private securityPledgeSigned?: boolean;

  constructor(
    name: string,
    username: string,
    passwordHash: string,
    locality: string,
    userId?: string,
    ratingAverage: number = 5.0,
    ratingCount: number = 1,
    finesOwed: number = 0.0,
    finesPaid: number = 0.0,
    joinedDate: string = new Date().toISOString().split('T')[0],
    email: string = '',
    isVerified: boolean = false,
    emailVerified: boolean = false,
    idVerificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' = 'UNVERIFIED',
    idDocumentType?: 'Driver License' | 'Passport' | 'Utility Bill' | 'Community ID',
    verificationDate?: string,
    phone?: string,
    extraProofDetails?: string,
    securityPledgeSigned?: boolean
  ) {
    if (userId) {
      this.userId = userId;
      // sync counter if custom id passed
      const numPart = parseInt(userId.replace(/\D/g, ''), 10);
      if (!isNaN(numPart) && numPart >= User.idCounter) {
        User.idCounter = numPart + 1;
      }
    } else {
      User.idCounter++;
      this.userId = `U${User.idCounter}`;
    }

    this.name = name;
    this.username = username;
    this.passwordHash = passwordHash;
    this.locality = locality;
    this.ratingAverage = Math.round(ratingAverage * 10) / 10;
    this.ratingCount = ratingCount;
    this.finesOwed = finesOwed;
    this.finesPaid = finesPaid;
    this.joinedDate = joinedDate;
    this.email = email || `${username.toLowerCase().replace(/\s+/g, '')}@community.crsn`;
    this.isVerified = isVerified;
    this.emailVerified = emailVerified;
    this.idVerificationStatus = idVerificationStatus;
    this.idDocumentType = idDocumentType;
    this.verificationDate = verificationDate;
    this.phone = phone;
    this.extraProofDetails = extraProofDetails;
    this.securityPledgeSigned = securityPledgeSigned;
  }

  // Getters and Setters (Encapsulation)
  public getUserId(): string { return this.userId; }
  public getName(): string { return this.name; }
  public setName(name: string): void { this.name = name; }
  public getUsername(): string { return this.username; }
  public getLocality(): string { return this.locality; }
  public setLocality(loc: string): void { this.locality = loc; }
  public getRatingAverage(): number { return this.ratingAverage; }
  public getRatingCount(): number { return this.ratingCount; }
  public getFinesOwed(): number { return this.finesOwed; }
  public getFinesPaid(): number { return this.finesPaid; }
  public getJoinedDate(): string { return this.joinedDate; }
  public getEmail(): string { return this.email; }
  public setEmail(email: string): void { this.email = email; }
  public getPhone(): string | undefined { return this.phone; }
  public setPhone(p?: string): void { this.phone = p; }
  public getIsVerified(): boolean { return this.isVerified || this.idVerificationStatus === 'VERIFIED'; }
  public setIsVerified(v: boolean): void { this.isVerified = v; }
  public getEmailVerified(): boolean { return this.emailVerified; }
  public setEmailVerified(ev: boolean): void { this.emailVerified = ev; }
  public getIdVerificationStatus(): 'UNVERIFIED' | 'PENDING' | 'VERIFIED' { return this.idVerificationStatus; }
  public setIdVerificationStatus(status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED', docType?: any): void {
    this.idVerificationStatus = status;
    if (docType) this.idDocumentType = docType;
    if (status === 'VERIFIED') {
      this.isVerified = true;
      this.verificationDate = new Date().toISOString().split('T')[0];
    }
  }
  public getIdDocumentType(): string | undefined { return this.idDocumentType; }
  public getVerificationDate(): string | undefined { return this.verificationDate; }
  public getExtraProofDetails(): string | undefined { return this.extraProofDetails; }
  public setExtraProofDetails(details?: string): void { this.extraProofDetails = details; }
  public getSecurityPledgeSigned(): boolean | undefined { return this.securityPledgeSigned; }
  public setSecurityPledgeSigned(signed: boolean): void { this.securityPledgeSigned = signed; }

  public validatePassword(passwordAttempt: string): boolean {
    return this.passwordHash === passwordAttempt;
  }

  /**
   * Running average formula for trust score:
   * newAvg = ((currentAvg * count) + newScore) / (count + 1)
   */
  public addRating(newScore: number): void {
    if (newScore < 1 || newScore > 5) {
      throw new Error('Rating score must be between 1 and 5.');
    }
    const totalExistingScore = this.ratingAverage * this.ratingCount;
    this.ratingCount += 1;
    this.ratingAverage = Math.round(((totalExistingScore + newScore) / this.ratingCount) * 10) / 10;
  }

  public addFine(amount: number): void {
    if (amount > 0) {
      this.finesOwed = Math.round((this.finesOwed + amount) * 100) / 100;
    }
  }

  public payFine(amount: number): number {
    if (amount <= 0) return 0;
    const payment = Math.min(amount, this.finesOwed);
    this.finesOwed = Math.round((this.finesOwed - payment) * 100) / 100;
    this.finesPaid = Math.round((this.finesPaid + payment) * 100) / 100;
    return payment;
  }

  public toDTO(): UserDTO {
    return {
      userId: this.userId,
      name: this.name,
      username: this.username,
      email: this.email,
      phone: this.phone,
      locality: this.locality,
      ratingAverage: this.ratingAverage,
      ratingCount: this.ratingCount,
      finesOwed: this.finesOwed,
      finesPaid: this.finesPaid,
      joinedDate: this.joinedDate,
      isVerified: this.isVerified,
      emailVerified: this.emailVerified,
      idVerificationStatus: this.idVerificationStatus,
      idDocumentType: this.idDocumentType,
      verificationDate: this.verificationDate,
      extraProofDetails: this.extraProofDetails,
      securityPledgeSigned: this.securityPledgeSigned
    };
  }

  public static fromDTO(dto: UserDTO, passwordHash: string = 'password123'): User {
    return new User(
      dto.name,
      dto.username,
      dto.password || passwordHash,
      dto.locality,
      dto.userId,
      dto.ratingAverage,
      dto.ratingCount,
      dto.finesOwed,
      dto.finesPaid,
      dto.joinedDate,
      dto.email,
      dto.isVerified || false,
      dto.emailVerified || false,
      dto.idVerificationStatus || 'UNVERIFIED',
      dto.idDocumentType,
      dto.verificationDate,
      dto.phone,
      dto.extraProofDetails,
      dto.securityPledgeSigned
    );
  }
}
