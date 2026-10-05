/**
 * service/UserService.java equivalent
 * Encapsulates all user business logic, validation, authentication, and rating updates.
 */
import { UserDTO } from '../../types';
import { User } from '../model/User';
import { UserRepository } from '../repository/UserRepository';
import { FileManager } from '../util/FileManager';
import { Validation } from '../util/Validation';

export class UserService {
  private userRepo: UserRepository = UserRepository.getInstance();

  public register(name: string, username: string, password: string, locality: string): User {
    const validName = Validation.validateNonEmpty(name, 'Full Name');
    const validUsername = Validation.validateUsername(username);
    const validPassword = Validation.validatePassword(password);
    const validLocality = Validation.validateNonEmpty(locality, 'Locality');

    if (this.userRepo.existsByUsername(validUsername)) {
      throw new Error(`Username '${validUsername}' is already taken. Please choose another.`);
    }

    const newUser = new User(validName, validUsername, validPassword, validLocality);
    this.userRepo.save(newUser);

    FileManager.logTransaction(
      'REGISTER',
      newUser.getUserId(),
      newUser.getName(),
      `New user registered from locality '${validLocality}'`
    );

    return newUser;
  }

  public login(username: string, password: string): User {
    const trimmedUsername = Validation.validateNonEmpty(username, 'Username').toLowerCase();
    const validPassword = Validation.validateNonEmpty(password, 'Password');

    const user = this.userRepo.findByUsername(trimmedUsername);
    if (!user) {
      throw new Error(`No account found with username '${username}'.`);
    }

    if (!user.validatePassword(validPassword)) {
      throw new Error('Incorrect password. Please verify your credentials.');
    }

    FileManager.logTransaction(
      'LOGIN',
      user.getUserId(),
      user.getName(),
      `User logged in successfully`
    );

    return user;
  }

  public getUserById(userId: string): User {
    const user = this.userRepo.findById(userId);
    if (!user) {
      throw new Error(`User with ID '${userId}' not found.`);
    }
    return user;
  }

  public getUserByUsername(username: string): User | undefined {
    return this.userRepo.findByUsername(username);
  }

  public getAllUsers(): User[] {
    return this.userRepo.findAll();
  }

  public payUserFine(userId: string, amount: number): number {
    const user = this.getUserById(userId);
    const validAmount = Validation.validatePositiveAmount(amount, 'Payment Amount');
    const paid = user.payFine(validAmount);
    this.userRepo.save(user);

    FileManager.logTransaction(
      'FINE_PAYMENT',
      user.getUserId(),
      user.getName(),
      `Paid $${paid.toFixed(2)} towards outstanding dues. Remaining owed: $${user.getFinesOwed().toFixed(2)}`
    );

    return paid;
  }

  public rateUser(targetUserId: string, score: number, ratedByName: string, context: string): void {
    const user = this.getUserById(targetUserId);
    const validScore = Validation.validateRating(score);
    user.addRating(validScore);
    this.userRepo.save(user);

    FileManager.logTransaction(
      'RATE_USER',
      user.getUserId(),
      user.getName(),
      `Rated ${validScore} stars by ${ratedByName} (${context}). New running avg: ${user.getRatingAverage()} (${user.getRatingCount()} reviews)`
    );
  }

  public getUserProfile(userId: string): UserDTO {
    return this.getUserById(userId).toDTO();
  }
}
