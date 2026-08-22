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
    //
    // Scoped to the first tab list rather than counting every tab on the page:
    // the demo grows, and a whole-page count fails every time it does without
    // telling you anything about the wiring.
    const tablist = fixture.nativeElement.querySelector('[role="tablist"]');

    expect(tablist).toBeTruthy();
    expect(tablist.querySelectorAll('[role="tab"]').length).toBe(4);
  });
});
