/**
 * Locus Tasks — Hire human taskers programmatically
 * For work that AI can't do alone: graphic design, written content, etc.
 */

import { LocusClient, getClient } from './client.js';

export interface TaskRequest {
  title: string;
  description: string;
  category: string; // 'graphic_design' | 'written_content' | 'data_entry' | etc.
  budget: number;
  deadline?: string; // ISO date
  requirements?: string[];
}

export interface Task {
  id: string;
  title: string;
  status: string;
  category: string;
  budget: number;
  created_at: string;
  deliverables?: any[];
}

export class TasksService {
  private client: LocusClient;

  constructor(client?: LocusClient) {
    this.client = client || getClient();
  }

  /** 
   * Fetch the Tasks/Hire app documentation
   * Tasks is available as an app — fetch docs first to learn endpoints
   */
  async fetchDocs(): Promise<string> {
    // /apps/md returns raw markdown, not JSON
    return this.client.fetchText(
      `${process.env.LOCUS_API_BASE || 'https://beta-api.paywithlocus.com/api'}/apps/md`
    );
  }

  /** Create a task for a human worker */
  async createTask(task: TaskRequest): Promise<Task | null> {
    console.log(`[Tasks] Creating task: ${task.title} ($${task.budget})`);
    
    // Tasks may be under /apps/ or a specific endpoint
    // We'll try the apps endpoint first
    const res = await this.client.post<Task>('/apps/tasks/create', task);
    if (!res.success) {
      console.error(`[Tasks] Create failed: ${res.message}`);
      // Try alternative endpoint
      const res2 = await this.client.post<Task>('/tasks/create', task);
      if (!res2.success) {
        console.error(`[Tasks] Alt create also failed: ${res2.message}`);
        return null;
      }
      return res2.data!;
    }
    return res.data!;
  }

  /** Check task status */
  async getTask(taskId: string): Promise<Task | null> {
    const res = await this.client.get<Task>(`/apps/tasks/${taskId}`);
    if (!res.success) return null;
    return res.data!;
  }

  /** List all tasks */
  async listTasks(): Promise<Task[]> {
    const res = await this.client.get<{ tasks: Task[] }>('/apps/tasks');
    if (!res.success) return [];
    return res.data?.tasks || [];
  }
}
