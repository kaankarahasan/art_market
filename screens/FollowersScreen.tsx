import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const followersData = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
  { id: '4', name: 'David' },
];

const FollowersScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Followers</Text>
      <FlatList
        data={followersData}
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

export default FollowersScreen;
