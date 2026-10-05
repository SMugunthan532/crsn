/**
 * repository/UserRepository.java equivalent
 * Demonstrates Collections Framework: HashMap<String, User> for O(1) user lookup by username
 */
import { UserDTO } from '../../types';
import { User } from '../model/User';

export class UserRepository {
  private static instance: UserRepository;
  private usersByUsername: Map<string, User> = new Map();
  private usersById: Map<string, User> = new Map();
  private readonly STORAGE_KEY = 'crsn_users_data';

  private constructor() {}

  public static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository();
    }
    return UserRepository.instance;
  }

  public save(user: User): User {
    this.usersByUsername.set(user.getUsername().toLowerCase(), user);
    this.usersById.set(user.getUserId(), user);
    this.persist();
    return user;
  }

  public findByUsername(username: string): User | undefined {
    return this.usersByUsername.get(username.trim().toLowerCase());
  }

  public findById(userId: string): User | undefined {
    return this.usersById.get(userId);
  }

  public existsByUsername(username: string): boolean {
    return this.usersByUsername.has(username.trim().toLowerCase());
  }

  public findAll(): User[] {
    return Array.from(this.usersById.values());
  }

  public loadFromDTOs(dtos: UserDTO[]): void {
    this.usersByUsername.clear();
    this.usersById.clear();
    for (const dto of dtos) {
      const u = User.fromDTO(dto);
      this.usersByUsername.set(u.getUsername().toLowerCase(), u);
      this.usersById.set(u.getUserId(), u);
    }
  }

  public persist(): void {
    try {
      const dtos = this.findAll().map(u => u.toDTO());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dtos));
    } catch {
      // ignore
    }
  }

  public loadFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const dtos: UserDTO[] = JSON.parse(raw);
        if (dtos && dtos.length > 0) {
          this.loadFromDTOs(dtos);
          return true;
        }
      }
    } catch {
      // fallback
    }
    return false;
  }
}
