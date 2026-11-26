'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { WebinarCard } from '@/components/webinars/WebinarCard';
import { EmptyState, LoadingBlock } from '@/components/ui/Badges';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { apiGetPage, buildQuery, errorMessage } from '@/lib/api';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DATE_FILTER_SCOPES,
  PAGE_SIZE,
  SORT_OPTIONS,
} from '@/lib/constants';
import type { PageMeta, WebinarCard as WebinarCardType, WebinarCategory } from '@/lib/types';

type Scope = (typeof DATE_FILTER_SCOPES)[number]['key'];
type Sort = (typeof SORT_OPTIONS)[number]['value'];

const DEFAULT_META: PageMeta = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

export function EventsExplorer() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<WebinarCategory | ''>('');
  const [scope, setScope] = useState<Scope>('active');
  const [sort, setSort] = useState<Sort>('soonest');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<WebinarCardType[]>([]);
  const [meta, setMeta] = useState<PageMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [category, scope, sort]);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError('');

    const query = buildQuery({
      q: debouncedSearch || undefined,
      category: category || undefined,
      scope,
      sort,
      page,
      limit: PAGE_SIZE,
    });

    apiGetPage<WebinarCardType>(`/webinars${query}`)
      .then((result) => {
        if (requestId !== requestRef.current) return;
        setItems(result.data);
        setMeta(result.meta);
      })
      .catch((caught) => {
        if (requestId !== requestRef.current) return;
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (requestId !== requestRef.current) return;
        setLoading(false);
      });

  }, [debouncedSearch, category, scope, sort, page, reloadKey]);

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setScope('active');
    setSort('soonest');
    setPage(1);
  };

  const hasFilters = Boolean(search || category || scope !== 'active' || sort !== 'soonest');

  const handleChanged = (updated: WebinarCardType) => {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  return (
    <div className="app-page events-page">
      <div className="container">
        <header className="page-heading">
          <div>
            <p className="page-heading__eyebrow">Каталог заходів</p>
            <h1 className="page-heading__title">Знайдіть свій наступний захід</h1>
            <p className="page-heading__text">
              Живі вебінари, практичні воркшопи та розбори від спікерів спільноти «Сцена».
              Фільтруйте за темою, форматом і датою.
            </p>
          </div>
          <Link href="/create" className="btn btn--primary">
            <Icon name="i-plus" size={18} /> Створити захід
          </Link>
        </header>

        <section className="events-toolbar" aria-label="Пошук і фільтри">
          <div className="search-field">
            <Icon name="i-search" size={19} />
            <label className="sr-only" htmlFor="events-search">Пошук заходів</label>
            <input
              id="events-search"
              type="search"
              placeholder="Пошук за назвою, описом або спікером…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={80}
            />
            {search ? (
              <button type="button" className="search-field__clear" onClick={() => setSearch('')} aria-label="Очистити пошук">
                <Icon name="i-close" size={16} />
              </button>
            ) : null}
          </div>

          <div className="events-toolbar__row">
            <div className="scope-tabs" role="group" aria-label="Статус заходів">
              {DATE_FILTER_SCOPES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={scope === item.key}
                  className={`scope-tabs__tab ${scope === item.key ? 'is-active' : ''}`}
                  onClick={() => setScope(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="select-field">
              <label className="sr-only" htmlFor="events-sort">Сортування</label>
              <Icon name="i-filter" size={16} />
              <select id="events-sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-chips" aria-label="Категорії">
            <button
              type="button"
              className={`filter-chip ${category === '' ? 'is-active' : ''}`}
              onClick={() => setCategory('')}
              aria-pressed={category === ''}
            >
              Усі теми
            </button>
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={`filter-chip ${category === item ? 'is-active' : ''}`}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>
        </section>

        <div className="events-results" ref={resultsRef}>
          <div className="events-results__head">
            <p className="events-results__count" role="status">
              {loading ? 'Шукаємо заходи…' : `Знайдено: ${meta.total}`}
              {debouncedSearch ? ` за запитом «${debouncedSearch}»` : ''}
            </p>
            {hasFilters ? (
              <button type="button" className="text-button" onClick={resetFilters}>
                <Icon name="i-refresh" size={15} /> Скинути фільтри
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="inline-error" role="alert">
              <Icon name="i-alert" size={20} />
              <div>
                <p>{error}</p>
                <button type="button" className="text-button" onClick={() => setReloadKey((value) => value + 1)}>
                  Спробувати ще раз
                </button>
              </div>
            </div>
          ) : loading ? (
            <LoadingBlock rows={4} />
          ) : items.length === 0 ? (
            <EmptyState
              icon="i-search"
              title="Заходів не знайдено"
              text="Спробуйте змінити запит або фільтри. Можливо, варто створити власний захід?"
              action={<Link href="/create" className="btn btn--primary">Створити захід</Link>}
            />
          ) : (
            <div className="webinar-grid">
              {items.map((webinar) => (
                <WebinarCard key={webinar.id} webinar={webinar} onChanged={handleChanged} />
              ))}
            </div>
          )}

          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={goToPage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
