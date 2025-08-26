import { supabase } from '../lib/supabase';

export class SQLExecutionService {
  
  async executeSQL(sql: string): Promise<any> {
    console.log(`🔧 Executing SQL: ${sql.substring(0, 100)}...`);
    
    try {
      // Use the query method to execute raw SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.error('❌ SQL execution failed:', error);
        throw error;
      }
      
      console.log('✅ SQL executed successfully');
      return data;
      
    } catch (error) {
      console.error('❌ SQL execution exception:', error);
      throw error;
    }
  }
  
  async createTableIfNotExists(tableName: string, createTableSQL: string): Promise<void> {
    console.log(`📋 Creating table ${tableName} if it doesn't exist...`);
    
    try {
      await this.executeSQL(createTableSQL);
      console.log(`✅ Table ${tableName} created/verified successfully`);
    } catch (error) {
      console.error(`❌ Failed to create table ${tableName}:`, error);
      throw error;
    }
  }
  
  async insertData(tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) return;
    
    console.log(`📥 Inserting ${data.length} records into ${tableName}...`);
    
    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(data, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ Failed to insert data into ${tableName}:`, error);
        throw error;
      }
      
      console.log(`✅ Successfully inserted ${data.length} records into ${tableName}`);
    } catch (error) {
      console.error(`❌ Exception inserting data into ${tableName}:`, error);
      throw error;
    }
  }
  
  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      return !error;
    } catch {
      return false;
    }
  }
  
  async getTableCount(tableName: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Error getting count for ${tableName}:`, error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error(`❌ Exception getting count for ${tableName}:`, error);
      return 0;
    }
  }
}
