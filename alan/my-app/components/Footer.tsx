import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { TabType } from './Types'

interface FooterProps {
  activeTab?: TabType
  onTabPress?: (tab: TabType) => void
}

export default function Footer({ activeTab: initialActiveTab = 'home', onTabPress }: FooterProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialActiveTab)

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab)
    onTabPress?.(tab)
  }

  const tabs = [
    { id: 'home' as TabType, label: 'Home' },
    { id: 'friends' as TabType, label: 'Friends' },
    { id: 'plan' as TabType, label: 'Plan' },
    { id: 'map' as TabType, label: 'Map' },
    { id: 'review' as TabType, label: 'Review' }
  ]

  return (
    <View style={styles.footer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && styles.activeTab
          ]}
          onPress={() => handleTabPress(tab.id)}
        >
          <Text style={[
            styles.tabText,
            activeTab === tab.id && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
})
