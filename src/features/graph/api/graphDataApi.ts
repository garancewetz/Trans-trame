import { supabase } from '@/lib/supabase'

/** Payload générique pour insert/update Supabase (schéma non généré). */
export type DbRow = Record<string, unknown>

export async function loadGraphDataFromSupabase() {
  const [booksRes, authorsRes, linksRes] = await Promise.all([
    supabase.from('books').select('*').order('created_at', { ascending: true }),
    supabase.from('authors').select('*').order('created_at', { ascending: true }),
    supabase.from('links').select('*'),
  ])

  return { booksRes, authorsRes, linksRes }
}

export function insertBookRow(row: DbRow) {
  return supabase.from('books').insert(row)
}

export function updateBookRowById(id: string, fields: DbRow) {
  return supabase.from('books').update(fields).eq('id', id)
}

export function deleteBookRowById(id: string) {
  return supabase.from('books').delete().eq('id', id)
}

export function insertAuthorRow(row: DbRow | DbRow[]) {
  return supabase.from('authors').insert(row)
}

export function updateAuthorRowById(id: string, fields: DbRow) {
  return supabase.from('authors').update(fields).eq('id', id)
}

export function deleteAuthorRowById(id: string) {
  return supabase.from('authors').delete().eq('id', id)
}

export function insertLinkRow(row: DbRow) {
  return supabase.from('links').insert(row)
}

export function updateLinkRowById(id: string, fields: DbRow) {
  return supabase.from('links').update(fields).eq('id', id)
}

export function deleteLinkRowById(id: string) {
  return supabase.from('links').delete().eq('id', id)
}

export function deleteAllBooks() {
  return supabase.from('books').delete().not('id', 'is', null)
}
