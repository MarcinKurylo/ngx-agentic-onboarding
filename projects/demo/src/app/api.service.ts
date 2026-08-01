import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
}

export interface Stats {
  projects: number;
  tasks: number;
  completion: number;
  series: number[];
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

  /** Simulated GET /stats. */
  getStats(): Observable<Stats> {
    return of<Stats>({
      projects: this.projects.length,
      tasks: 42,
      completion: 0.68,
      series: [40, 70, 55, 90, 65, 80],
    }).pipe(delay(1100));
  }
}
