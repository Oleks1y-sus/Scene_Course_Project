'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { LoadingBlock } from '@/components/ui/Badges';
import {
  apiGet,
  apiPatch,
  apiPost,
  apiRequest,
  ApiError,
  errorMessage,
} from '@/lib/api';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  COVER_PRESETS,
} from '@/lib/constants';
import {
  defaultStartsAt,
  formatDateTime,
  formatDuration,
  fromDatetimeLocal,
  toDatetimeLocal,
} from '@/lib/format';
import type { UploadResult, WebinarCategory, WebinarDetail } from '@/lib/types';

type CoverMode = 'preset' | 'upload' | 'keep';

interface FormState {
  title: string;
  description: string;
  category: WebinarCategory;
  tags: string[];
  startsAt: string;
  durationMinutes: string;
  capacity: string;
}

const EMPTY: FormState = {
  title: '',
  description: '',
  category: 'TECHNOLOGY',
  tags: [],
  startsAt: defaultStartsAt(),
  durationMinutes: '60',
  capacity: '100',
};

const TAG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

const validate = (form: FormState, isCreate: boolean): Record<string, string> => {
  const fields: Record<string, string> = {};
  const title = form.title.trim();
  if (title.length < 5) fields.title = 'Назва має містити щонайменше 5 символів.';
  if (title.length > 120) fields.title = 'Назва має містити не більше 120 символів.';
  if (/[<>]/.test(title)) fields.title = 'Назва не може містити HTML-символи.';

  const description = form.description.trim();
  if (description.length < 40) fields.description = 'Опис має містити щонайменше 40 символів.';
  if (description.length > 5000) fields.description = 'Опис має містити не більше 5000 символів.';
  if (/[<>]/.test(description)) fields.description = 'Опис не може містити HTML-символи.';

  if (!form.startsAt) {
    fields.startsAt = 'Вкажіть дату та час.';
  } else if (isCreate) {
    const date = new Date(form.startsAt);
    if (Number.isNaN(date.getTime())) fields.startsAt = 'Некоректна дата.';
    else if (date.getTime() < Date.now() + 5 * 60_000) fields.startsAt = 'Дата має бути щонайменше на 5 хвилин у майбутньому.';
  }

  const duration = Number(form.durationMinutes);
  if (!Number.isInteger(duration) || duration < 15 || duration > 480) fields.durationMinutes = 'Від 15 до 480 хвилин.';

  const capacity = Number(form.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10_000) fields.capacity = 'Від 1 до 10 000 учасників.';

  return fields;
};

export function WebinarForm({ mode, webinarId }: { mode: 'create' | 'edit'; webinarId?: string }) {
  const router = useRouter();
  const isCreate = mode === 'create';
  const [form, setForm] = useState<FormState>(EMPTY);
  const [coverMode, setCoverMode] = useState<CoverMode>(isCreate ? 'preset' : 'keep');
  const [coverPreset, setCoverPreset] = useState('cover-01');
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState(COVER_PRESETS[0]!.url);
  const [tagInput, setTagInput] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!isCreate);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [existing, setExisting] = useState<WebinarDetail | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreate || !webinarId) return;
    let active = true;
    setLoading(true);
    apiGet<WebinarDetail>(`/webinars/${webinarId}`)
      .then((webinar) => {
        if (!active) return;
        if (!webinar.canManage) {
          setLoadError('Керувати цим заходом може лише його організатор.');
          return;
        }
        setExisting(webinar);
        setForm({
          title: webinar.title,
          description: webinar.description,
          category: webinar.category,
          tags: webinar.tags,
          startsAt: toDatetimeLocal(webinar.startsAt),
          durationMinutes: String(webinar.durationMinutes),
          capacity: String(webinar.capacity),
        });
        setCoverPreview(webinar.coverUrl);
        const presetMatch = webinar.coverUrl.match(/\/img\/covers\/(cover-\d+)\.svg/);
        if (presetMatch?.[1]) {
          setCoverMode('preset');
          setCoverPreset(presetMatch[1]);
        } else {
          setCoverMode('keep');
        }
      })
      .catch((caught) => {
        if (active) setLoadError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isCreate, webinarId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFields((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const addTag = () => {
    const value = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (!value) return;
    if (value.length < 2 || value.length > 24 || !TAG_PATTERN.test(value)) {
      setFields((current) => ({ ...current, tags: 'Тег може містити літери, цифри та дефіс (2–24 символи).' }));
      return;
    }
    if (form.tags.includes(value)) {
      setTagInput('');
      return;
    }
    if (form.tags.length >= 5) {
      setFields((current) => ({ ...current, tags: 'Можна додати не більше 5 тегів.' }));
      return;
    }
    update('tags', [...form.tags, value]);
    setTagInput('');
  };

  const removeTag = (tag: string) => update('tags', form.tags.filter((item) => item !== tag));

  const selectPreset = (preset: string, url: string) => {
    setCoverMode('preset');
    setCoverPreset(preset);
    setCoverMediaId(null);
    setCoverPreview(url);
    setUploadError('');
  };

  const uploadCover = async (file: File) => {
    setUploadError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Підтримуються лише JPEG, PNG або WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Максимальний розмір зображення — 2 МБ.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await apiRequest<UploadResult>('/uploads/cover', { method: 'POST', body });
      setCoverMode('upload');
      setCoverMediaId(response.data.id);
      setCoverPreview(response.data.url);
    } catch (caught) {
      setUploadError(errorMessage(caught));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const nextFields = validate(form, isCreate);
    setFields(nextFields);
    if (Object.keys(nextFields).length > 0) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        tags: form.tags,
        startsAt: fromDatetimeLocal(form.startsAt),
        durationMinutes: Number(form.durationMinutes),
        capacity: Number(form.capacity),
      };

      if (coverMode === 'preset') body.cover = { type: 'preset', preset: coverPreset };
      if (coverMode === 'upload' && coverMediaId) body.cover = { type: 'media', mediaId: coverMediaId };

      const webinar = isCreate
        ? await apiPost<WebinarDetail>('/webinars', body)
        : await apiPatch<WebinarDetail>(`/webinars/${webinarId}`, body);

      if (webinar.moderationStatus === 'PENDING') {
        router.push('/profile?tab=created&notice=moderation');
      } else {
        router.push(`/events/${webinar.id}`);
      }
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setFields(caught.fields ?? {});
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-page">
        <div className="container"><LoadingBlock rows={4} /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-page">
        <div className="container">
          <div className="inline-error" role="alert">
            <Icon name="i-alert" size={20} />
            <div>
              <p>{loadError}</p>
              <Link href="/events" className="text-button">До каталогу заходів</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const parsedPreviewDate = new Date(form.startsAt);
  const previewDate = Number.isNaN(parsedPreviewDate.getTime())
    ? new Date().toISOString()
    : parsedPreviewDate.toISOString();

  return (
    <div className="app-page create-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Навігаційний ланцюжок">
          <Link href="/events">Заходи</Link>
          <Icon name="i-chevron-right" size={14} />
          <span aria-current="page">{isCreate ? 'Новий захід' : 'Редагування'}</span>
        </nav>

        <header className="page-heading page-heading--compact">
          <div>
            <p className="page-heading__eyebrow">{isCreate ? 'Новий захід' : 'Налаштування'}</p>
            <h1 className="page-heading__title">{isCreate ? 'Створіть захід' : 'Редагуйте захід'}</h1>
            <p className="page-heading__text">
              Заповніть основну інформацію. Після публікації захід з’явиться в каталозі, а ви зможете
              розпочати та завершити ефір.
            </p>
          </div>
        </header>

        {existing && existing.moderationStatus !== 'VISIBLE' ? (
          <div className="moderation-alert" role="status">
            <Icon name="i-shield" size={22} />
            <div>
              <strong>Захід на модерації</strong>
              <p>Зміни збережуться, але захід залишиться прихованим до рішення адміністратора.</p>
            </div>
          </div>
        ) : null}

        {error ? <p className="form__alert" role="alert">{error}</p> : null}

        <form className="create-layout" onSubmit={submit} noValidate>
          <div className="create-form panel">
            <div className="form__group">
              <label className="form__label" htmlFor="webinar-title">Назва заходу</label>
              <input
                className={`form__control ${fields.title ? 'is-invalid' : ''}`}
                id="webinar-title"
                name="title"
                type="text"
                maxLength={120}
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="Наприклад: Практичний воркшоп з UX-досліджень"
                required
                aria-invalid={Boolean(fields.title)}
                aria-describedby="webinar-title-help"
              />
              <div className="form__meta" id="webinar-title-help">
                {fields.title ? <p className="form__error">{fields.title}</p> : <span>5–120 символів, без HTML</span>}
                <span>{form.title.length}/120</span>
              </div>
            </div>

            <div className="form__group">
              <label className="form__label" htmlFor="webinar-description">Опис</label>
              <textarea
                className={`form__control form__control--textarea ${fields.description ? 'is-invalid' : ''}`}
                id="webinar-description"
                name="description"
                rows={7}
                maxLength={5000}
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Розкажіть, що отримають учасники, які теми розглянете та кому буде корисно."
                required
                aria-invalid={Boolean(fields.description)}
              />
              <div className="form__meta">
                {fields.description ? <p className="form__error">{fields.description}</p> : <span>Мінімум 40 символів</span>}
                <span>{form.description.length}/5000</span>
              </div>
            </div>

            <div className="form__row">
              <div className="form__group">
                <label className="form__label" htmlFor="webinar-category">Категорія</label>
                <select
                  className="form__control"
                  id="webinar-category"
                  name="category"
                  value={form.category}
                  onChange={(event) => update('category', event.target.value as WebinarCategory)}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                  ))}
                </select>
              </div>

              <div className="form__group">
                <label className="form__label" htmlFor="webinar-duration">Тривалість, хв</label>
                <input
                  className={`form__control ${fields.durationMinutes ? 'is-invalid' : ''}`}
                  id="webinar-duration"
                  name="durationMinutes"
                  type="number"
                  min={15}
                  max={480}
                  step={5}
                  value={form.durationMinutes}
                  onChange={(event) => update('durationMinutes', event.target.value)}
                  required
                  aria-invalid={Boolean(fields.durationMinutes)}
                />
                {fields.durationMinutes ? <p className="form__error">{fields.durationMinutes}</p> : null}
              </div>
            </div>

            <div className="form__row">
              <div className="form__group">
                <label className="form__label" htmlFor="webinar-starts">Дата та час початку</label>
                <input
                  className={`form__control ${fields.startsAt ? 'is-invalid' : ''}`}
                  id="webinar-starts"
                  name="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => update('startsAt', event.target.value)}
                  required
                  aria-invalid={Boolean(fields.startsAt)}
                />
                {fields.startsAt ? <p className="form__error">{fields.startsAt}</p> : null}
              </div>

              <div className="form__group">
                <label className="form__label" htmlFor="webinar-capacity">Місткість</label>
                <input
                  className={`form__control ${fields.capacity ? 'is-invalid' : ''}`}
                  id="webinar-capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  max={10000}
                  value={form.capacity}
                  onChange={(event) => update('capacity', event.target.value)}
                  required
                  aria-invalid={Boolean(fields.capacity)}
                />
                {fields.capacity ? <p className="form__error">{fields.capacity}</p> : null}
              </div>
            </div>

            <div className="form__group">
              <label className="form__label" htmlFor="webinar-tags">Теги <span className="form__hint">(до 5)</span></label>
              <div className="tag-input">
                {form.tags.map((tag) => (
                  <span key={tag} className="tag-input__chip">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} aria-label={`Видалити тег ${tag}`}>
                      <Icon name="i-close" size={13} />
                    </button>
                  </span>
                ))}
                <input
                  id="webinar-tags"
                  type="text"
                  value={tagInput}
                  maxLength={24}
                  placeholder={form.tags.length >= 5 ? 'Ліміт тегів' : 'Додати тег…'}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  disabled={form.tags.length >= 5}
                />
              </div>
              {fields.tags ? <p className="form__error">{fields.tags}</p> : null}
            </div>

            <div className="form__group">
              <span className="form__label" id="cover-label">Обкладинка</span>
              <div className="cover-picker" role="group" aria-labelledby="cover-label">
                {coverMode === 'keep' ? (
                  <button
                    type="button"
                    className="cover-option is-active cover-option--current"
                    onClick={() => setCoverMode('keep')}
                    aria-pressed={coverMode === 'keep'}
                  >
                    <img src={coverPreview} alt="Поточна обкладинка" />
                    <span>Поточна</span>
                  </button>
                ) : null}
                {COVER_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={`cover-option ${coverMode === 'preset' && coverPreset === preset.key ? 'is-active' : ''}`}
                    onClick={() => selectPreset(preset.key, preset.url)}
                    aria-pressed={coverMode === 'preset' && coverPreset === preset.key}
                  >
                    <img src={preset.url} alt={`Варіант обкладинки «${preset.label}»`} />
                    <span>{preset.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`cover-option cover-option--upload ${coverMode === 'upload' ? 'is-active' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  aria-pressed={coverMode === 'upload'}
                  disabled={uploading}
                >
                  {coverMode === 'upload' ? (
                    <img src={coverPreview} alt="Завантажена обкладинка" />
                  ) : (
                    <span className="cover-option__placeholder"><Icon name="i-upload" size={22} /></span>
                  )}
                  <span>{uploading ? 'Завантаження…' : 'Своє фото'}</span>
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadCover(file);
                }}
                aria-label="Завантажити власну обкладинку"
              />
              <p className="form__hint">JPEG, PNG або WebP, до 2 МБ. Зображення автоматично стискається у WebP.</p>
              {uploadError ? <p className="form__error">{uploadError}</p> : null}
            </div>

            <div className="create-form__actions">
              <Link href={isCreate ? '/events' : `/events/${webinarId}`} className="btn btn--ghost">Скасувати</Link>
              <button type="submit" className="btn btn--primary" disabled={saving || uploading}>
                {saving ? 'Зберігаємо…' : isCreate ? 'Створити захід' : 'Зберегти зміни'}
              </button>
            </div>
          </div>

          <aside className="create-preview" aria-label="Попередній перегляд">
            <p className="create-preview__eyebrow">Попередній перегляд</p>
            <div className="preview-card">
              <img src={coverPreview} alt="Попередній перегляд обкладинки" />
              <div className="preview-card__badges">
                <span className="status-badge status-badge--upcoming">Заплановано</span>
                <span className="category-badge">{CATEGORY_LABELS[form.category]}</span>
              </div>
              <div className="preview-card__body">
                <h2 className="preview-card__title">{form.title.trim() || 'Назва вашого заходу'}</h2>
                <p className="preview-card__excerpt">
                  {form.description.trim().slice(0, 130) || 'Короткий опис з’явиться тут після заповнення форми.'}
                </p>
                <p className="preview-card__meta">
                  <Icon name="i-calendar" size={15} /> {formatDateTime(previewDate)}
                </p>
                <p className="preview-card__meta">
                  <Icon name="i-clock" size={15} /> {formatDuration(Math.max(0, Number(form.durationMinutes) || 0))}
                  <span>·</span>
                  <Icon name="i-users" size={15} /> до {form.capacity || '0'} учасників
                </p>
              </div>
            </div>
            <div className="create-preview__tips">
              <h2>Поради для гарного заходу</h2>
              <ul>
                <li>Назва має пояснювати користь за 1–2 секунди.</li>
                <li>Додайте конкретні теми та формат участі.</li>
                <li>Перевірте дату й часовий пояс перед публікацією.</li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
