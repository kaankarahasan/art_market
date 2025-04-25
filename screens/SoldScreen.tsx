import React, { useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SoldContext } from '../contexts/SoldContext'; // Context'i doğru şekilde import ediyoruz

const SoldScreen = () => {
  const { setSoldCount } = useContext(SoldContext); // setSoldCount'ü context'ten alıyoruz

  // Örnek satılan ürünler listesi
  const soldProducts = [
    { id: '1', title: 'Satılan Ürün 1' },
    { id: '2', title: 'Satılan Ürün 2' },
    { id: '3', title: 'Satılan Ürün 3' },
    { id: '4', title: 'Satılan Ürün 4' },
    { id: '5', title: 'Satılan Ürün 5' },
  ];

  useEffect(() => {
    setSoldCount(soldProducts.length); // Satılan ürün sayısını context'e yaz
  }, [soldProducts.length]); // soldProducts.length'i dependency olarak ekliyoruz

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Satılan Ürünler</Text>
      <FlatList
        data={soldProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.productBox}>
            <Text style={styles.productText}>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  productBox: {
    padding: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
  },
  productText: {
    fontSize: 16,
  },
});

export default SoldScreen;
