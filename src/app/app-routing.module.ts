import { PatientRegisterComponent } from './components/useregister/patientregister.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PsyregisterComponent } from './components/psyregister/psyregister.component';
import { PsychoService } from './services/psycho.service';
import { AppComponent } from './app.component';
import { VerifyComponent } from './components/verify/verify.component';
import { PsychtermsComponent } from './components/psychterms/psychterms.component';
import { ApplyComponent } from './components/apply/apply.component';


const routes: Routes = [
  {path: '', component: HomeComponent},
  {path: 'apply/psychologist', component: PsyregisterComponent },
  {path: 'apply', component: ApplyComponent },
  {path: 'verify', component: VerifyComponent },
  {path: 'psychologist-terms', component: PsychtermsComponent },
  {path: 'signup', component: PatientRegisterComponent}
];

@NgModule({
  exports: [RouterModule],
  imports: [
    RouterModule.forRoot(routes)
  ],
  providers: [PsychoService],
  bootstrap: [AppComponent]
})
export class AppRoutingModule { }