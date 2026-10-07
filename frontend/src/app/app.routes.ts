import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';
import { ShellComponent } from './layout/shell';
import { HomeComponent } from './marketing/home';
import { AboutComponent, FeaturesComponent, HowItWorksComponent, SecurityComponent, ContactComponent } from './marketing/pages';
import { LoginComponent, RegisterComponent, ForgotPasswordComponent } from './authpages/auth-pages';
import { DashboardComponent } from './dashboard/dashboard';
import { PatientsComponent } from './patients/patients';
import { PatientNewComponent } from './patients/patient-new';
import { PatientDetailComponent } from './patients/patient-detail';
import { DigitalTwinComponent } from './digitaltwin/twin';
import { TwinListComponent } from './digitaltwin/twin-list';
import { Patient360RedirectComponent } from './patients/patient-360';
import { FhirComponent } from './fhir/fhir';
import { ConsentComponent } from './consent/consent';
import { RiskListComponent, RiskDetailComponent } from './risk/risk';
import { ModelsComponent } from './models/models';
import { FederatedComponent } from './federated/federated';
import { MonitoringComponent } from './monitoring/monitoring';
import { AlertsComponent } from './alerts/alerts';
import { CarePlansComponent, CarePlanDetailComponent, CarePlanGenerateComponent, AdherenceComponent } from './careplans/careplans';
import { PopulationComponent } from './population/population';
import { ProvidersComponent } from './providers/providers';
import { AuditComponent } from './audit/audit';
import { NotificationsComponent } from './notifications/notifications';
import { ReportsComponent } from './reports/reports';
import { SettingsComponent } from './settings/settings';
import { ProfileComponent } from './profile/profile';
import { SearchComponent } from './search';

// Role guard factories (SUPER_ADMIN implicitly allowed by roleGuard)
const staffOnly = roleGuard(['ADMIN', 'PROVIDER', 'NURSE', 'CARE_MANAGER']);
const clinicalStaff = roleGuard(['ADMIN', 'PROVIDER', 'CARE_MANAGER']);
const adminOnly = roleGuard(['ADMIN']);
const providerAdmin = roleGuard(['ADMIN', 'PROVIDER']);

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'features', component: FeaturesComponent },
  { path: 'how-it-works', component: HowItWorksComponent },
  { path: 'security', component: SecurityComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ForgotPasswordComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'patients', component: PatientsComponent, canActivate: [staffOnly] },
      { path: 'patients/new', component: PatientNewComponent, canActivate: [staffOnly] },
      { path: 'patients/360', component: Patient360RedirectComponent },
      { path: 'patients/:id', component: PatientDetailComponent },
      { path: 'patients/:id/digital-twin', component: DigitalTwinComponent },
      { path: 'digital-twins', component: TwinListComponent, canActivate: [staffOnly] },
      { path: 'fhir', component: FhirComponent, canActivate: [clinicalStaff] },
      { path: 'consent', component: ConsentComponent },
      { path: 'risk-predictions', component: RiskListComponent },
      { path: 'risk-predictions/:patientId', component: RiskDetailComponent },
      { path: 'models', component: ModelsComponent, canActivate: [providerAdmin] },
      { path: 'federated-learning', component: FederatedComponent, canActivate: [providerAdmin] },
      { path: 'monitoring', component: MonitoringComponent, canActivate: [staffOnly] },
      { path: 'alerts', component: AlertsComponent },
      { path: 'care-plans', component: CarePlansComponent },
      { path: 'care-plans/generate', component: CarePlanGenerateComponent, canActivate: [clinicalStaff] },
      { path: 'care-plans/:id', component: CarePlanDetailComponent },
      { path: 'care-plans/:id/adherence', component: AdherenceComponent },
      { path: 'population-health', component: PopulationComponent, canActivate: [clinicalStaff] },
      { path: 'providers', component: ProvidersComponent, canActivate: [adminOnly] },
      { path: 'audit-logs', component: AuditComponent, canActivate: [roleGuard(['ADMIN', 'CARE_MANAGER', 'PROVIDER'])] },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'reports', component: ReportsComponent, canActivate: [clinicalStaff] },
      { path: 'settings', component: SettingsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'search', component: SearchComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
