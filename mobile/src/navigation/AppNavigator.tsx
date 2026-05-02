import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { WordGardenScreen } from '../screens/WordGardenScreen';
import { NavigationParamList } from '../types';

const Tab = createBottomTabNavigator<NavigationParamList>();

function GardenIcon({ focused }: { focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconFocused]}>{focused ? '🌿' : '🌱'}</Text>;
}

function HomeIcon({ focused }: { focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconFocused]}>{focused ? '📖' : '📕'}</Text>;
}

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#161b22',
            borderTopColor: '#30363d',
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 68,
          },
          tabBarActiveTintColor: '#f1c40f',
          tabBarInactiveTintColor: '#8b949e',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Wird',
            tabBarIcon: HomeIcon,
          }}
        />
        <Tab.Screen
          name="WordGarden"
          component={WordGardenScreen}
          options={{
            tabBarLabel: 'Garden',
            tabBarIcon: GardenIcon,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  icon: {
    fontSize: 22,
  },
  iconFocused: {
    fontSize: 24,
  },
});
