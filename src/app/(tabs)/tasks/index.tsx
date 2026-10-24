import { useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Chip } from '@/components/work-items/Chip';
import { WorkItemCard } from '@/components/work-items/WorkItemCard';
import type { WorkItemDetail } from '@/core/api/types';
import { useWorkItems } from '@/hooks/use-work-items';
import {
  workItemStatusOptions,
  workItemTypeOptions,
} from '@/services/work-item-options';
import { colors, radius, spacing } from '@/theme/tokens';

export default function TasksScreen() {
  const router = useRouter();
  const {
    items,
    totalCount,
    filters,
    setFilters,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    reload,
    refresh,
    loadMore,
  } = useWorkItems();

  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  const openItem = useCallback(
    (item: WorkItemDetail) => {
      router.push({ pathname: '/tasks/[id]', params: { id: item.id } });
    },
    [router]
  );

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Công việc</Text>
          <Text style={styles.title}>Danh sách công việc</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/tasks/new')}
          style={styles.createButton}
          testID="tasks-create"
        >
          <Text style={styles.createButtonText}>+ Tạo</Text>
        </Pressable>
      </View>

      <Text style={styles.count}>
        {totalCount > 0 ? `${totalCount} công việc` : 'Chưa có công việc'}
      </Text>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Trạng thái</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <Chip
              label="Tất cả"
              selected={filters.status === null}
              onPress={() => setFilters({ ...filters, status: null })}
              testID="filter-status-all"
            />
            {workItemStatusOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={filters.status === option.value}
                onPress={() => setFilters({ ...filters, status: option.value })}
                testID={`filter-status-${option.value}`}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Loại</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <Chip
              label="Tất cả"
              selected={filters.type === null}
              onPress={() => setFilters({ ...filters, type: null })}
              testID="filter-type-all"
            />
            {workItemTypeOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={filters.type === option.value}
                onPress={() => setFilters({ ...filters, type: option.value })}
                testID={`filter-type-${option.value}`}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {error && items.length > 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={reload} testID="tasks-retry-banner">
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const empty = () => {
    if (loading) {
      return (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} testID="tasks-loading" />
          <Text style={styles.stateText}>Đang tải công việc…</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.state}>
          <Text style={styles.errorText} testID="tasks-error">
            {error}
          </Text>
          <Pressable onPress={reload} style={styles.retryButton} testID="tasks-retry">
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle} testID="tasks-empty">
          Chưa có công việc nào
        </Text>
        <Text style={styles.stateText}>
          Tạo công việc đầu tiên để bắt đầu sắp xếp phiên tập trung.
        </Text>
      </View>
    );
  };

  const footer = () => {
    if (loadingMore) {
      return <ActivityIndicator color={colors.primary} testID="tasks-loading-more" />;
    }
    if (hasMore) {
      return (
        <Pressable onPress={loadMore} style={styles.loadMore} testID="tasks-load-more">
          <Text style={styles.loadMoreText}>Tải thêm</Text>
        </Pressable>
      );
    }
    if (items.length > 0) {
      return <Text style={styles.endText}>Đã hết danh sách</Text>;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WorkItemCard item={item} onPress={() => openItem(item)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  headerBlock: { gap: spacing.md, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xs },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  createButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  createButtonText: { color: '#FFFFFF', fontWeight: '800' },
  count: { color: colors.muted },
  filterGroup: { gap: spacing.xs },
  filterLabel: { color: colors.text, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: spacing.xs, paddingRight: spacing.sm },
  separator: { height: spacing.md },
  errorBanner: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  errorText: { color: colors.danger, fontWeight: '600' },
  retryText: { color: colors.primary, fontWeight: '800' },
  state: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  stateTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  stateText: { color: colors.muted, textAlign: 'center' },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  retryButtonText: { color: '#FFFFFF', fontWeight: '800' },
  loadMore: {
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  loadMoreText: { color: colors.primary, fontWeight: '800', textAlign: 'center' },
  endText: { color: colors.muted, textAlign: 'center', marginTop: spacing.md },
});
