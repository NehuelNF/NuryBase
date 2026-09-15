import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  imports: [RouterOutlet, Sidebar],
  selector: 'app-main-layout',
  styleUrl: './main-layout.css',
  templateUrl: './main-layout.html',
})
export class MainLayout {}
