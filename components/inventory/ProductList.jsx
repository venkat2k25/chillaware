import React from "react";
import { FlatList, Text, StyleSheet } from "react-native";
import ProductCard from "./ProductCard";
import Colors from "../../utils/Colors";

const ProductList = ({
  filteredData,
  recordingStates,
  handleMicPress,
  deleteItem,
  numColumns = 2,
}) => (
  <>
    {filteredData.length === 0 ? (
      <Text style={styles.noDataText}>
        {filteredData.length === 0
          ? "No inventory items found."
          : "No items match your filter."}
      </Text>
    ) : (
      <FlatList
        data={filteredData}
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            onMicPress={() => handleMicPress(item.id)}
            onDeletePress={() => deleteItem(item.id, item.originalIndex)}
            recordingState={recordingStates[item.id]}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={numColumns}
        columnWrapperStyle={styles.columnWrapper}
        key={`flatlist-${numColumns}`}
      />
    )}
  </>
);

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  noDataText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
    marginTop: 20,
  },
});

export default ProductList;