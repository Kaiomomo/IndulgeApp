import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AlreadyAccount = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>AlreadyAccount Screen</Text>
    </View>
  );
};

export default AlreadyAccount;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
