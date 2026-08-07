import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    // The shell's side nav uses routerLink, so the component needs a router
    // even though these tests never navigate.
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the demo page', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading?.textContent).toContain('Carbon tokens');
  });

  it('wires the tab list to @angular/aria', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    // role=tablist / role=tab come from the Aria primitive, not from our markup.
    // If this fails, the hostDirectives wiring in ui/tabs/tabs.ts is broken.
    const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');

    expect(tablist).toBeTruthy();
    expect(tabs.length).toBe(4);
  });
});
