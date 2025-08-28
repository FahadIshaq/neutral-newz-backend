import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_EXPIRES_IN = '24h';

  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateToken(user: { id: string; username: string; role: string }): string {
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  static async registerUser(userData: RegisterData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('admin_users')
        .select('*')
        .or(`username.eq.${userData.username},email.eq.${userData.email}`)
        .maybeSingle(); // Use maybeSingle() to handle case where user doesn't exist

      if (existingUser) {
        return { 
          success: false, 
          error: 'Username or email already exists' 
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user
      const { data: newUser, error: createError } = await supabase
        .from('admin_users')
        .insert({
          username: userData.username,
          email: userData.email,
          password_hash: hashedPassword,
          role: 'admin'
        })
        .select()
        .single(); // Keep single() here since we're inserting and expecting exactly one result

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = newUser;
      
      return { 
        success: true, 
        user: userWithoutPassword as User 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async loginUser(credentials: LoginCredentials): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
    try {
      // Find user by username
      const { data: user, error: findError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', credentials.username)
        .maybeSingle(); // Use maybeSingle() to handle case where user doesn't exist

      if (findError || !user) {
        return { 
          success: false, 
          error: 'Invalid username or password' 
        };
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        return { 
          success: false, 
          error: 'Invalid username or password' 
        };
      }

      // Generate JWT token
      const token = this.generateToken({
        id: user.id,
        username: user.username,
        role: user.role
      });

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = user;

      return { 
        success: true, 
        token,
        user: userWithoutPassword as User 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async getUserById(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data: user, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() to handle case where user doesn't exist

      if (error || !user) {
        return { 
          success: false, 
          error: 'User not found' 
        };
      }

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = user;

      return { 
        success: true, 
        user: userWithoutPassword as User 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user
      const { data: user, error: findError } = await supabase
        .from('admin_users')
        .select('password_hash')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() to handle case where user doesn't exist

      if (findError || !user) {
        return { 
          success: false, 
          error: 'User not found' 
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return { 
          success: false, 
          error: 'Current password is incorrect' 
        };
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: hashedNewPassword })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}
