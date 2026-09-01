import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memoryStorage.js';

let st;
beforeEach(async () => {
  installMemoryStorage();
  st = await import('../src/js/ui/state.js');
});

test('ui state defaults and validation', () => {
  assert.deepEqual(st.loadUiState(), {
    filter: 'all', search: '', sortColumn: null, sortDirection: 'asc', pinnedCollapsed: false, historyCollapsed: false,
  });
  st.saveUiState({ filter: 'snow', search: 'egg', sortColumn: 'price', sortDirection: 'desc', pinnedCollapsed: true, historyCollapsed: false });
  assert.deepEqual(st.loadUiState(), { filter: 'snow', search: 'egg', sortColumn: 'price', sortDirection: 'desc', pinnedCollapsed: true, historyCollapsed: false });
  localStorage.setItem('restock.ui.v1', JSON.stringify({ sortColumn: 'bogus', sortDirection: 'sideways' }));
  const s = st.loadUiState();
  assert.equal(s.sortColumn, null);
  assert.equal(s.sortDirection, 'asc');
});

test('tracked migrates legacy trackedItems once', () => {
  localStorage.setItem('trackedItems', JSON.stringify(['seed:Carrot', 'egg:CommonEgg']));
  const set = st.loadTracked();
  assert.deepEqual([...set], ['seed:Carrot', 'egg:CommonEgg']);
  assert.equal(localStorage.getItem('trackedItems'), null);
  assert.deepEqual(JSON.parse(localStorage.getItem('restock.tracked')), ['seed:Carrot', 'egg:CommonEgg']);
  set.add('tool:Shovel');
  st.saveTracked(set);
  assert.deepEqual([...st.loadTracked()], ['seed:Carrot', 'egg:CommonEgg', 'tool:Shovel']);
});

test('theme', () => {
  assert.equal(st.loadTheme(), 'dark');
  st.saveTheme('light');
  assert.equal(st.loadTheme(), 'light');
});
