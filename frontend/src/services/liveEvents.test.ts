import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject } from './subject';

describe('Subject', () => {
  it('multicasts values to all subscribers', () => {
    const subject = new Subject<number>();
    const seenA: number[] = [];
    const seenB: number[] = [];

    subject.subscribe((v) => seenA.push(v));
    subject.subscribe((v) => seenB.push(v));

    subject.next(1);
    subject.next(2);

    expect(seenA).toEqual([1, 2]);
    expect(seenB).toEqual([1, 2]);
  });

  it('stops delivering after unsubscribe', () => {
    const subject = new Subject<string>();
    const seen: string[] = [];
    const sub = subject.subscribe((v) => seen.push(v));

    subject.next('a');
    sub.unsubscribe();
    subject.next('b');

    expect(seen).toEqual(['a']);
  });

  it('isolates handler errors so one bad subscriber cannot break others', () => {
    const subject = new Subject<number>();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen: number[] = [];

    subject.subscribe(() => {
      throw new Error('boom');
    });
    subject.subscribe((v) => seen.push(v));

    subject.next(7);
    expect(seen).toEqual([7]);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('reports observer count', () => {
    const subject = new Subject<void>();
    const s1 = subject.subscribe(() => {});
    expect(subject.observerCount).toBe(1);
    const s2 = subject.subscribe(() => {});
    expect(subject.observerCount).toBe(2);
    s1.unsubscribe();
    s2.unsubscribe();
    expect(subject.observerCount).toBe(0);
  });
});

describe('live event simulation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits templated platform events on an interval when mock mode connects', async () => {
    const { connectLiveEvents, liveEvents$ } = await import('./liveEvents');
    const seen: unknown[] = [];
    const sub = liveEvents$.subscribe((e) => seen.push(e));

    const dispose = connectLiveEvents();
    vi.advanceTimersByTime(14_000 * 3);

    expect(seen.length).toBeGreaterThanOrEqual(3);
    const first = seen[0] as { id: string; type: string; title: string; ts: string };
    expect(first.id).toMatch(/^evt-/);
    expect(typeof first.title).toBe('string');
    expect(new Date(first.ts).getTime()).not.toBeNaN();

    dispose();
    sub.unsubscribe();
    vi.advanceTimersByTime(14_000 * 2);
    // No further events after dispose
    expect(seen.length).toBe(3);
  });
});
