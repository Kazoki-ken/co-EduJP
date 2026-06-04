import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import apiClient from '../api/client';
import type { Word, Book, PaginatedResponse } from '@vocabjp/shared';
import { SavedWordRow, SavedBookRow } from './ProfileScreen';

const { width: SCREEN_W } = Dimensions.get('window');
const PAGE_SIZE = 40;

export default function SavedItemsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { type } = route.params as { type: 'words' | 'books' };

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async (targetPage: number, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const endpoint = type === 'words' ? '/users/me/saved-words' : '/users/me/saved-books';
      const { data } = await apiClient.get<PaginatedResponse<any>>(endpoint, {
        params: { page: targetPage, limit: PAGE_SIZE },
      });

      setItems(data.data);
      setPage(data.meta.page);
      setTotalPages(data.meta.totalPages);
      setTotalItems(data.meta.total);
    } catch (err) {
      console.log('Failed to fetch saved items', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      fetchItems(newPage);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push('...');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (page < totalPages - 2) {
        pages.push('...');
      }
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const title = type === 'words' ? 'Saqlangan so\'zlar' : 'Saqlangan kitoblar';
  const emptyMessage = type === 'words'
    ? 'Hozircha saqlangan so\'zlar yo\'q.'
    : 'Hozircha saqlangan kitoblar yo\'q.';

  return (
    <View style={styles.container}>
      {/* Background orbs */}
      <View pointerEvents="none" style={styles.orb} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#f9fafb" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.subtitleText}>Jami: {totalItems} ta</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={type === 'words' ? '#7c3aed' : '#f97316'} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={type === 'words' ? 'document-text-outline' : 'library-outline'}
            size={64}
            color="rgba(255,255,255,0.12)"
          />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        >
          <BlurView intensity={18} tint="dark" style={styles.cardContainer}>
            <View style={styles.innerCard}>
              {type === 'words'
                ? items.map(w => <SavedWordRow key={w.id} word={w} />)
                : items.map(b => <SavedBookRow key={b.id} book={b} />)
              }
            </View>
          </BlurView>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              {/* Prev Button */}
              <TouchableOpacity
                disabled={page === 1}
                onPress={() => handlePageChange(page - 1)}
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
              >
                <Ionicons name="chevron-back" size={16} color={page === 1 ? '#4b5563' : '#f9fafb'} />
              </TouchableOpacity>

              {/* Page Numbers */}
              {getPageNumbers().map((p, idx) => {
                if (p === '...') {
                  return (
                    <View key={`dots-${idx}`} style={styles.dots}>
                      <Text style={styles.dotsText}>...</Text>
                    </View>
                  );
                }
                const isSelected = p === page;
                const buttonCol = type === 'words' ? '#7c3aed' : '#f97316';
                return (
                  <TouchableOpacity
                    key={`page-${p}`}
                    onPress={() => handlePageChange(p as number)}
                    style={[
                      styles.pageNumberButton,
                      isSelected && { backgroundColor: buttonCol, borderColor: buttonCol }
                    ]}
                  >
                    <Text style={[styles.pageText, isSelected && styles.pageTextSelected]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Next Button */}
              <TouchableOpacity
                disabled={page === totalPages}
                onPress={() => handlePageChange(page + 1)}
                style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
              >
                <Ionicons name="chevron-forward" size={16} color={page === totalPages ? '#4b5563' : '#f9fafb'} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  orb: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(109,40,217,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  titleText: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitleText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 24,
  },
  innerCard: {
    backgroundColor: 'rgba(10,10,26,0.85)',
    padding: 16,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageNumberButton: {
    minWidth: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pageText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  pageTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dots: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsText: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '600',
  },
});
