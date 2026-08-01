import { Routes } from '@angular/router';
import { CdkLabComponent } from './cdk-lab.component';
import { DashboardComponent } from './dashboard.component';
import { HomeComponent } from './home.component';
import { SettingsComponent } from './settings.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'cdk-lab', component: CdkLabComponent },
];
