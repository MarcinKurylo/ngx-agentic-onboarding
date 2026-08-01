import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
}

export type StatsRange = '7d' | '30d' | '90d';

export interface Stats {
  projects: number;
  tasks: number;
  completion: number;
  series: number[];
  /** Premium-only signal, surfaced on the dashboard for team plans. */
  velocity: number;
}

/**
 * Fake backend. Every method returns an Observable with artificial latency via
 * `delay()`, so the UI shows real loaders and the onboarding engine has to wait
 * for elements to appear after each "request" resolves.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private projects: Project[] = [
    { id: 1, name: 'Apollo', status: 'active' },
    { id: 2, name: 'Zephyr', status: 'archived' },
    { id: 3, name: 'Nimbus', status: 'active' },
  ];

  /** Simulated GET /projects (optionally filtered by status). */
  getProjects(status?: ProjectStatus): Observable<Project[]> {
    const data =
      status == null
        ? [...this.projects]
        : this.projects.filter((p) => p.status === status);
    return of(data).pipe(delay(900));
  }

  /** Simulated POST /projects. */
  createProject(name: string): Observable<Project> {
    const project: Project = {
      id: Date.now(),
      name: name.trim() || 'Bez nazwy',
      status: 'active',
    };
    this.projects = [project, ...this.projects];
    return of(project).pipe(delay(1200));
  }

  /** Simulated GET /stats for a given time range. */
  getStats(range: StatsRange = '30d'): Observable<Stats> {
    const shape: Record<StatsRange, { series: number[]; tasks: number; velocity: number }> = {
      '7d': { series: [55, 40, 70, 90, 60], tasks: 12, velocity: 7 },
      '30d': { series: [40, 70, 55, 90, 65, 80], tasks: 42, velocity: 21 },
      '90d': { series: [30, 45, 60, 50, 75, 65, 85, 95], tasks: 128, velocity: 63 },
    };
    const s = shape[range];
    return of<Stats>({
      projects: this.projects.length,
      tasks: s.tasks,
      completion: 0.68,
      series: s.series,
      velocity: s.velocity,
    }).pipe(delay(1100));
  }
}
