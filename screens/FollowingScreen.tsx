import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const followingData = [
  { id: '1', name: 'Emma' },
  { id: '2', name: 'Frank' },
  { id: '3', name: 'Grace' },
  { id: '4', name: 'Hannah' },
];

const FollowingScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Following</Text>
      <FlatList
        data={followingData}
        renderItem={({ item }) => <Text style={styles.item}>{item.name}</Text>}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  item: {
    fontSize: 18,
    marginVertical: 10,
  },
});

export default FollowingScreen;
