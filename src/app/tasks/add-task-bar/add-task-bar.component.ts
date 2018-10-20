import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TaskService } from '../task.service';
import { JiraApiService } from '../../issue/jira/jira-api.service';
import { debounceTime, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { ProjectService } from '../../project/project.service';
import { JiraIssue } from '../../issue/jira/jira-issue/jira-issue.model';
import { Subject } from 'rxjs';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss']
})
export class AddTaskBarComponent implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject<boolean>();
  taskSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions: any[];
  isLoading = false;

  constructor(
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _jiraApiService: JiraApiService,
  ) {
  }

  ngOnInit() {
    this.taskSuggestionsCtrl.setValue('');
    this.taskSuggestionsCtrl.valueChanges.pipe(
      withLatestFrom(this._projectService.currentJiraCfg$),
      tap(([searchTerm, jiraCfg]) => {
        if (jiraCfg.isEnabled) {
          this.isLoading = true;
        }
      }),
      debounceTime(200),
      switchMap(([searchTerm, jiraCfg]) => {
        if (searchTerm && searchTerm.length > 1 && jiraCfg && jiraCfg.isEnabled) {
          return this._jiraApiService.search(searchTerm);
        } else {
          // Note: the outer array signifies the observable stream the other is the value
          return [[]];
        }
      }),
      takeUntil(this.destroy$)
    )
      .subscribe((val) => {
        this.isLoading = false;
        this.filteredIssueSuggestions = val;
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onBlur() {
  }

  displayWith(issue: JiraIssue) {
    return issue && issue.summary;
  }

  addTask() {
    const issueOrTitle = this.taskSuggestionsCtrl.value;
    if (typeof issueOrTitle === 'string') {
      this._taskService.add(issueOrTitle);
    } else {
      this._taskService.addWithIssue(
        issueOrTitle.summary,
        'JIRA',
        issueOrTitle,
      );
    }
    this.taskSuggestionsCtrl.setValue('');
  }
}
