<template>
<div class="app">

  <!-- =========================
       管理者用画面
  ========================== -->
  <div v-if="showAdmin" class="admin-screen">
    <div class="admin-header">
      <div><span class="eyebrow">ADMIN PANEL</span><h1>管理者用画面</h1></div>
      <button class="admin-back-button" @click="closeAdmin">← 戻る</button>
    </div>
    <div v-if="loadingAdmin" class="admin-loading">統計データを読み込んでいます...</div>
    <div v-else class="admin-stats-grid">
      <div class="admin-stat-card"><span>総ユーザー数</span><strong>{{ adminStats.totalUsers }}</strong><small>人</small></div>
      <div class="admin-stat-card"><span>総プレイ回数</span><strong>{{ adminStats.totalPlays }}</strong><small>回</small></div>
      <div class="admin-stat-card"><span>総投稿数</span><strong>{{ adminStats.totalPosts }}</strong><small>件</small></div>
      <div class="admin-stat-card highlight"><span>一日あたりのプレイ回数</span><strong>{{ adminStats.dailyPlays }}</strong><small>回（今日）</small></div>
    </div>
    <button class="admin-refresh-button" @click="fetchAdminStats">🔄 統計を更新</button>

    <div class="admin-post-management">
      <h2>投稿管理</h2>
      <p>すべてのユーザーの投稿を管理者権限で削除できます。</p>
      <button
        class="admin-delete-all-button"
        :disabled="deletingAllPosts"
        @click="deleteAllPosts"
      >
        {{ deletingAllPosts ? "全投稿を削除中..." : "🗑️ すべての投稿を削除" }}
      </button>

      <div class="admin-post-list">
        <h3>投稿を個別に削除</h3>

        <div v-if="loadingAdminPosts" class="admin-post-loading">
          投稿を読み込んでいます...
        </div>

        <div v-else-if="adminPosts.length === 0" class="admin-no-posts">
          現在、投稿はありません。
        </div>

        <div v-else class="admin-post-items">
          <div
            v-for="post in adminPosts"
            :key="`admin-post-${post.id}`"
            class="admin-post-item"
          >
            <div class="admin-post-item-info">
              <strong>{{ post.user_id }}</strong>
              <span>{{ post.formation }}</span>
              <small>{{ formatDate(post.created_at) }} ・ ❤️ {{ post.likes || 0 }}</small>
            </div>

            <button
              class="admin-delete-post-button"
              :disabled="deletingPostId === post.id"
              @click="deletePostAsAdmin(post)"
            >
              {{ deletingPostId === post.id ? "削除中..." : "🗑️ この投稿を削除" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <button class="admin-close-button" @click="closeAdmin">閉じる</button>
  </div>

  <!-- =========================
       いいねランキング
  ========================== -->
  <div
    v-else-if="showRanking"
    class="ranking-screen"
  >
    <div class="top-bar">
      <h1>🏆 LIKE RANKING</h1>
      <div class="user-area">
        <span>{{ userId }}</span>
      </div>
    </div>

    <div class="ranking-header">
      <span class="eyebrow">BEST XI RANKING</span>
      <h2>いいねランキング TOP10</h2>
      <p>みんなから多くのいいねを集めたBest XIです</p>
    </div>

    <div v-if="loadingRanking" class="ranking-loading">
      ランキングを読み込んでいます...
    </div>

    <div v-else class="ranking-list">
      <div
        v-for="(post, index) in rankingPosts"
        :key="`ranking-${post.id}`"
        class="ranking-item"
        @click="openPostFromRanking(post)"
      >
        <div class="ranking-number">
          <span v-if="index === 0">🥇</span>
          <span v-else-if="index === 1">🥈</span>
          <span v-else-if="index === 2">🥉</span>
          <strong v-else>{{ index + 1 }}</strong>
        </div>

        <div class="ranking-main">
          <div class="ranking-user">
            <strong>{{ post.user_id }}</strong>
            <span v-if="post.user_id === userId">あなた</span>
          </div>
          <div class="ranking-formation">{{ post.formation }}</div>
        </div>

        <div class="ranking-likes">
          <strong>❤️ {{ post.likes || 0 }}</strong>
          <small>いいね</small>
        </div>
      </div>

      <div v-if="rankingPosts.length === 0" class="no-ranking">
        まだ投稿がありません。
      </div>
    </div>

    <div class="ranking-actions">
      <button class="back-button" @click="closeRanking">
        ← 戻る
      </button>
      <button class="back-button" @click="openPosts">
        📋 投稿一覧を見る
      </button>
    </div>
  </div>

  <!-- =========================
       タイトル画面
  ========================== -->
  <div v-else-if="!gameStarted && !showPosts && !showRanking" class="title-screen">

    <h1>⚽ Real Madrid XI</h1>

    <p>最強のレアル・マドリードを作ろう</p>

    <div class="user-id">
      あなたのID：{{ userId }}
    </div>

    <button
      class="start-button"
      :disabled="!cardImagesReady"
      @click="startGame"
    >
      {{ cardImagesReady ? "GAME START" : "画像を準備中..." }}
    </button>

    <button class="posts-title-button" @click="openPosts">
      📋 みんなのBest XIを見る
    </button>

    <button class="ranking-title-button" @click="openRanking">
      🏆 いいねランキング TOP10
    </button>

    <button class="admin-title-button" @click="openAdmin">
      ⚙️ 管理者用画面
    </button>

  </div>


  <!-- =========================
       放出選手選択画面
  ========================== -->
  <div
    v-else-if="selectingPlayerToSell"
    class="sell-screen"
  >

    <div class="top-bar">
      <h1>⚽ MY BEST XI</h1>

      <div class="user-area">
        <span>{{ userId }}</span>

        <div class="money">
          💰 {{ money }}M€
        </div>

        <div
          class="turn"
          :class="{ danger: turns <= 3 }"
        >
          ⏳ 残り {{ turns }} / {{ GAME_SETTINGS.MAX_TURNS }}ターン
        </div>
      </div>
    </div>


    <div class="sell-container">

      <div class="sell-header">

        <h2>誰を放出しますか？</h2>

        <p>
          <strong>{{ selectedCandidate?.name }}</strong>
          を獲得するために、現在の選手を1人放出してください。
          <br>
          （移籍には1ターン必要です）
        </p>

      </div>


      <div
        v-if="selectedCandidate"
        class="target-player"
      >

        <div class="target-position">
          {{ selectedCandidate.position }}
        </div>

        <div class="target-name">
          {{ selectedCandidate.name }}
        </div>

        <div class="target-price">
          獲得費用：{{ selectedCandidate.price }}M€
        </div>

      </div>


      <div class="sell-grid">

        <button
          v-for="player in myPlayers"
          :key="player.name"
          class="sell-player"
          @click="acquirePlayer(player)"
        >

          <div class="sell-image-wrap">
            <img v-if="player.image" :src="player.image" :alt="player.name" class="sell-image" />
            <div v-else class="sell-image-fallback">⚽</div>
          </div>

          <div class="sell-position">
            {{ player.position }}
          </div>

          <div class="sell-name">
            {{ player.name }}
          </div>

          <div class="sell-price">
            放出 +{{ player.price }}M€
          </div>

        </button>

      </div>


      <button
        class="cancel-acquire"
        @click="cancelAcquire"
      >
        獲得しない（閉じる）
      </button>

    </div>

  </div>


  <!-- =========================
       初期選手公開
  ========================== -->
  <div
    v-else-if="initialReveal"
    class="reveal-screen"
  >

    <div class="reveal-header">
      <span class="eyebrow">INITIAL SQUAD</span>
      <h1>最初の11人を確認しよう</h1>
      <p v-if="revealStarted">{{ revealIndex + 1 }} / 11 人公開</p>
    </div>

    <div class="reveal-card-wrap">
      <div
        v-if="revealStarted && revealedPlayers[revealIndex]"
        class="reveal-card"
        :key="`reveal-card-${revealIndex}`"
      >
        <div class="reveal-card-shine"></div>
        <img
          v-if="revealedPlayers[revealIndex].image"
          :src="revealedPlayers[revealIndex].image"
          :alt="revealedPlayers[revealIndex].name"
          class="reveal-card-image"
        />
        <div v-else class="reveal-card-fallback">⚽</div>
      </div>
    </div>

    <button
      class="reveal-button"
      @click="revealNextPlayer"
    >
      {{ !revealStarted ? "タップして公開" : "公開中..." }}
    </button>

  </div>


  <!-- =========================
       ゲーム画面
  ========================== -->
  <div
    v-else-if="
      !teamBuilding &&
      !teamCompleted &&
      !postCompleted &&
      !showPosts
    "
    class="game-screen"
  >

    <div class="top-bar">

      <h1>⚽ MY BEST XI</h1>

      <div class="user-area">

        <span>{{ userId }}</span>

        <div class="money">
          💰 {{ money }}M€
        </div>

        <div
          class="turn"
          :class="{ danger: turns <= 3 }"
        >
          ⏳ 残り {{ turns }} / {{ GAME_SETTINGS.MAX_TURNS }}ターン
        </div>

      </div>

    </div>


    <div class="game-content">

      <div class="game-title">

        <h2>スカウトを選ぼう</h2>

        <p>
          スカウトには1ターン必要です。
        </p>

        <div class="turn-status">
          残りターン：<strong>{{ turns }}</strong>
          <span>/ {{ GAME_SETTINGS.MAX_TURNS }}</span>
        </div>

      </div>


      <!-- スカウト一覧 -->
      <div class="scout-grid">

        <button
          v-for="scout in scoutTypes"
          :key="scout.id"
          class="scout-card"
          :disabled="turns <= 0"
          @click="scoutPlayers(scout)"
        >

          <div class="scout-name">
            {{ scout.name }}
          </div>

          <div class="scout-description">
            {{ scout.description }}
          </div>

          <div class="scout-count">
            {{ scout.count }}人
          </div>

          <small>
            スカウト：1ターン
          </small>

        </button>

      </div>


      <!-- =========================
           スカウト候補
      ========================== -->
      <div
        v-if="candidates.length > 0"
        class="candidate-section"
      >

        <div class="section-title">

          <h2>🔎 スカウト候補</h2>

          <p>
            獲得したい選手を選択してください
          </p>

        </div>


        <div class="candidate-grid">

          <button
            v-for="player in candidates"
            :key="player.name"
            class="candidate-card"
            @click="selectCandidate(player)"
            :disabled="turns <= 0"
          >

            <div class="candidate-image-wrap">
              <img v-if="player.image" :src="player.image" :alt="player.name" class="candidate-image" />
              <div v-else class="candidate-image-fallback">⚽</div>
            </div>

            <div class="candidate-position">
              {{ player.position }}
            </div>

            <div class="candidate-name">
              {{ player.name }}
            </div>

            <div class="candidate-price">
              {{ player.price }}M€
            </div>

            <div class="candidate-action">
              この選手を獲得
            </div>

          </button>

        </div>

      </div>


      <!-- =========================
           現在のチーム
      ========================== -->
      <div class="my-team-section">

        <div class="section-title">

          <h2>👥 現在のチーム</h2>

          <p>
            {{ myPlayers.length }} / 11人
          </p>

        </div>


        <div class="my-player-grid">

          <div
            v-for="player in myPlayers"
            :key="player.name"
            class="my-player-card"
          >

            <div class="my-player-image-wrap">
              <img v-if="player.image" :src="player.image" :alt="player.name" class="my-player-image" />
              <div v-else class="my-player-image-fallback">⚽</div>
            </div>

            <span class="position">
              {{ player.position }}
            </span>

            <strong>
              {{ player.name }}
            </strong>

            <span class="price">
              {{ player.price }}M€
            </span>

          </div>

        </div>

      </div>


      <!-- ゲーム終了 -->
      <button
        class="finish-button"
        @click="finishGame"
      >
        {{ turns <= 0 ? "ゲーム終了 → チーム編成へ" : "チーム編成へ進む →" }}
      </button>

    </div>

  </div>


  <!-- =========================
       チーム編成
  ========================== -->
  <div
    v-else-if="teamBuilding && !teamCompleted"
    class="team-screen"
  >

    <div class="top-bar">
      <h1>⚽ TEAM BUILDING</h1>
      <div class="user-area">
        <span>{{ userId }}</span>
        <div class="money">💰 {{ money }}M€</div>
      </div>
    </div>

    <div class="formation-area">
      <div class="formation-heading">
        <div>
          <span class="eyebrow">TACTICAL BOARD</span>
          <h2>フォーメーションを選択</h2>
        </div>
        <div class="formation-current">
          <span>CURRENT</span>
          <strong>{{ currentFormation }}</strong>
        </div>
      </div>

      <div class="formation-buttons">
        <button
          v-for="formation in formations"
          :key="formation"
          :class="{ active: currentFormation === formation }"
          @click="changeFormation(formation)"
        >
          {{ formation }}
        </button>
      </div>
    </div>

    <div class="team-builder">

      <div class="pitch-panel">
        <div class="pitch-topline">
          <span>MY BEST XI</span>
          <span>{{ Object.keys(lineup).length }} / 11</span>
        </div>

        <div class="pitch">
          <div class="pitch-line halfway"></div>
          <div class="pitch-circle"></div>
          <div class="pitch-center-dot"></div>
          <div class="pitch-box pitch-box-top"></div>
          <div class="pitch-box pitch-box-bottom"></div>
          <div class="pitch-goal pitch-goal-top"></div>
          <div class="pitch-goal pitch-goal-bottom"></div>

          <div
            v-for="slot in formationSlots"
            :key="slot.id"
            class="slot"
            :class="{ selected: selectedSlot === slot.id, filled: lineup[slot.id] }"
            :style="slot.style"
            @click="selectSlot(slot.id)"
          >
            <div v-if="lineup[slot.id]" class="placed-player">
              <img
                v-if="lineup[slot.id].image"
                :src="lineup[slot.id].image"
                :alt="lineup[slot.id].name"
                class="placed-player-image"
              />
              <div v-else class="player-shirt">{{ lineup[slot.id].position }}</div>
            </div>
            <div v-else class="empty-slot">＋</div>
          </div>
        </div>
      </div>

      <aside class="selection-panel">
        <div class="selection-header">
          <span class="eyebrow">SQUAD</span>
          <h2>{{ selectedSlot ? "選手を配置" : "ポジションを選択" }}</h2>
          <p v-if="selectedSlot">空いている選手をタップしてください</p>
          <p v-else>ピッチのポジションをタップしてください</p>
        </div>

        <div class="selected-position" v-if="selectedSlot">
          選択中：<strong>{{ selectedSlot }}</strong>
        </div>

        <div class="select-player-grid">
          <button
            v-for="player in selectablePlayers"
            :key="player.name"
            class="select-player"
            :class="{ disabled: placedPlayers.includes(player) }"
            :disabled="!selectedSlot || placedPlayers.includes(player)"
            @click="placePlayer(player)"
          >
            <div class="select-player-image-wrap">
              <img v-if="player.image" :src="player.image" :alt="player.name" class="select-player-image" />
              <div v-else class="select-player-image-fallback">⚽</div>
            </div>
            <span class="select-player-position">{{ player.position }}</span>
            <span class="select-player-name">{{ player.name }}</span>
            <small>{{ player.price }}M€</small>
          </button>
        </div>

        <div class="selection-tip">
          💡 選手は好きなポジションに配置できます
        </div>
      </aside>
    </div>

    <button
      class="complete-button"
      :disabled="!isTeamComplete"
      @click="completeTeam"
    >
      チームを完成させる
    </button>

  </div>


  <!-- =========================
       チーム完成
  ========================== -->
  <div
    v-else-if="teamCompleted && !postCompleted"
    class="complete-screen"
  >

    <h1>🎉 TEAM COMPLETE!</h1>

    <p>
      あなたのBest XIが完成しました！
    </p>


    <div class="final-pitch">

      <div
        v-for="slot in formationSlots"
        :key="slot.id"
        class="final-slot"
        :style="slot.style"
      >

        <div class="final-player">

          <img v-if="lineup[slot.id]?.image" :src="lineup[slot.id]?.image" :alt="lineup[slot.id]?.name" class="final-player-image" />
          <div v-else class="player-icon">⚽</div>

        </div>

      </div>

    </div>


    <div class="team-info">

      <div>
        <span>FORMATION</span>
        <strong>{{ currentFormation }}</strong>
      </div>

      <div>
        <span>REMAINING</span>
        <strong>{{ money }}M€</strong>
      </div>

    </div>


    <div class="post-choice">
      <p>このBest XIを投稿しますか？</p>

      <div class="post-choice-buttons">
        <button
          class="post-button"
          :disabled="isPosting"
          @click="postTeam"
        >
          {{
            isPosting
              ? "投稿中..."
              : "📤 投稿する"
          }}
        </button>

        <button
          class="post-skip-button"
          @click="resetGame"
        >
          投稿しない
        </button>
      </div>
    </div>

  </div>


  <!-- =========================
       投稿完了
  ========================== -->
  <div
    v-else-if="postCompleted && !showPosts"
    class="post-screen"
  >

    <div class="post-success">

      <div class="success-icon">
        ✓
      </div>

      <h1>
        投稿完了！
      </h1>

      <p>
        {{ userId }} としてBest XIを投稿しました。
      </p>


      <div class="post-card">

        <div class="post-header">

          <div>

            <strong>
              {{ userId }}
            </strong>

            <span>
              あなた
            </span>

          </div>

          <small>
            今投稿したチーム
          </small>

        </div>


        <div class="post-formation">
          {{ currentFormation }}
        </div>


        <div class="post-players">

          <div
            v-for="slot in formationSlots"
            :key="slot.id"
            class="post-player"
          >
            <span class="post-player-name">{{ lineup[slot.id]?.name }}</span>
          </div>

        </div>


        <div class="post-info">

          <span>
            💰 残り {{ money }}M€
          </span>

          <span>
            ❤️ 0
          </span>

          <span>
            👁 0
          </span>

        </div>

      </div>


      <div class="post-actions">

        <button
          class="list-button"
          @click="openPosts"
        >
          📋 投稿一覧を見る
        </button>

        <button
          class="again-button"
          @click="resetGame"
        >
          🔄 もう一度作る
        </button>

      </div>

    </div>

  </div>


  <!-- =========================
       投稿一覧
  ========================== -->
  <div
    v-else-if="showPosts"
    class="posts-screen"
  >

    <div class="top-bar">

      <h1>
        📋 POST LIST
      </h1>

      <div class="user-area">
        <span>{{ userId }}</span>
      </div>

    </div>


    <div class="post-list-title">

      <h2>
        みんなのBest XI
      </h2>

      <p>
        みんなが作ったチームを見ることができます
      </p>

    </div>


    <div v-if="selectedPost && selectedPost.name !== undefined" class="post-detail">

      <button
        class="back-button detail-back"
        @click="selectedPost = null; clearPostUrl()"
      >
        ← 投稿一覧へ戻る
      </button>

      <div class="post-detail-card">
        <div class="post-item-header">
          <div>
            <strong>{{ selectedPost.user_id }}</strong>
            <span v-if="selectedPost.user_id === userId">あなた</span>
          </div>
          <small>{{ formatDate(selectedPost.created_at) }}</small>
        </div>

        <div class="post-item-formation">
          {{ selectedPost.formation }}
        </div>

        <div class="detail-pitch">
          <div
            v-for="(player, index) in selectedPost.players"
            :key="`detail-${selectedPost.id}-${index}-${player.id}`"
            class="detail-player"
            :style="getPostPlayerStyle(player, selectedPost.formation, index)"
          >
            <img
              v-if="getPlayerImage(player)"
              :src="getPlayerImage(player)"
              :alt="player.name"
              class="detail-player-image"
            />
            <div v-else class="detail-shirt">⚽</div>
          </div>
        </div>

        <div class="post-item-info">
          <span>💰 {{ selectedPost.money }}M€</span>
          <span>❤️ {{ selectedPost.likes }}</span>
        </div>

        <button
          class="share-button"
          @click="copyPostUrl(selectedPost)"
        >
          🔗 このBest XIのURLをコピー
        </button>

        <button
          v-if="selectedPost.user_id === userId"
          class="delete-post-detail-button"
          @click="deletePost(selectedPost)"
        >
          🗑️ この投稿を削除
        </button>
      </div>

      <button
        class="detail-close-button"
        @click="selectedPost = null; clearPostUrl()"
      >
        閉じる
      </button>

    </div>

    <div v-else class="post-list-content">

    <div class="sort-buttons">

      <button
        :class="{
          active: postSort === 'popular'
        }"
        @click="postSort = 'popular'"
      >
        🔥 人気順
      </button>

      <button
        :class="{
          active: postSort === 'newest'
        }"
        @click="postSort = 'newest'"
      >
        🆕 新着順
      </button>

    </div>


    <div
      v-if="loadingPosts"
      class="loading"
    >
      投稿を読み込んでいます...
    </div>


    <div
      v-else
      class="posts"
    >

      <div
        v-for="post in sortedPosts"
        :key="post.id"
        class="post-item"
      >

        <div class="post-item-header">

          <div>

            <strong>
              {{ post.user_id }}
            </strong>

            <span
              v-if="post.user_id === userId"
            >
              あなた
            </span>

          </div>

          <small>
            {{ formatDate(post.created_at) }}
          </small>

        </div>


        <div class="post-item-formation">
          {{ post.formation }}
        </div>


        <div
          class="mini-pitch"
          @click.stop="openPost(post)"
          title="フォーメーションをタップして詳細を見る"
        >

          <div
            v-for="(player, index) in post.players"
            :key="`${post.id}-${index}-${player.id}`"
            class="mini-player"
            :style="getPostPlayerStyle(player, post.formation, index)"
          >
            <span>{{ player.name }}</span>
          </div>

        </div>


        <div class="post-item-info">

          <span>
            💰 {{ post.money }}M€
          </span>

          <button
            class="like-button"
            :class="{ liked: hasLiked(post) }"
            :disabled="hasLiked(post) || likingPostId === post.id"
            @click.stop="likePost(post)"
          >
            {{ hasLiked(post) ? "❤️ いいね済み" : "❤️ いいね" }} {{ post.likes }}
          </button>

          <button
            v-if="post.user_id === userId"
            class="delete-post-button"
            @click.stop="deletePost(post)"
          >
            🗑️ 削除
          </button>


        </div>

      </div>


      <div
        v-if="posts.length === 0"
        class="no-post"
      >
        まだ投稿がありません。
      </div>

    </div>

    </div>


    <button
      class="back-button"
      @click="closePosts"
    >
      ← 戻る
    </button>

  </div>

</div>
</template>


<script setup>

import {
ref,
computed,
onMounted
} from "vue"

import { supabase } from "./supabase"


// ========================================
// ゲーム設定
// ========================================

const GAME_SETTINGS = {

INITIAL_MONEY: 100,

MAX_TURNS: 10,

INITIAL_TEAM: {
  GK: 1,
  DF: 4,
  MF: 3,
  FW: 3
}

}


// ========================================
// ユーザーID
// ========================================

let savedUserId =
localStorage.getItem("bestXI_userId")

let userNumber =
localStorage.getItem("bestXI_userNumber")

if (!userNumber) {

userNumber =
  Date.now()
    .toString()
    .slice(-6)

localStorage.setItem(
  "bestXI_userNumber",
  userNumber
)

}

const userId = ref(
savedUserId ||
`user_${userNumber}`
)

localStorage.setItem(
"bestXI_userId",
userId.value
)


// ========================================
// ゲーム状態
// ========================================

const gameStarted =
ref(false)

const teamBuilding =
ref(false)

const teamCompleted =
ref(false)

const postCompleted =
ref(false)

const showPosts =
ref(false)

const showRanking =
ref(false)

const rankingPosts =
ref([])

const loadingRanking =
ref(false)

// ========================================
// 管理者用画面
// ========================================

const ADMIN_USER_ID = "20033675"
const ADMIN_PASSWORD = "128283"
const showAdmin = ref(false)
const loadingAdmin = ref(false)
const adminStats = ref({ totalUsers: 0, totalPlays: 0, totalPosts: 0, dailyPlays: 0 })
const adminPosts = ref([])
const loadingAdminPosts = ref(false)
const deletingAllPosts = ref(false)
const deletingPostId = ref(null)

// ========================================
// 初期選手の公開演出
// ========================================

const initialReveal =
ref(false)

const revealIndex =
ref(0)

const revealedPlayers =
ref([])

const revealStarted =
ref(false)

let revealTimer = null

const selectedPost =
ref(null)


// ========================================
// お金・ターン
// ========================================

const money =
ref(GAME_SETTINGS.INITIAL_MONEY)

const turns =
ref(GAME_SETTINGS.MAX_TURNS)


// ========================================
// 選手データ
// ========================================

const players = ref([

// GK
{
  name: "クルトワ",
  position: "GK",
  price: 70
},
{
  name: "ルニン",
  position: "GK",
  price: 30
},
{
  name: "ケパ",
  position: "GK",
  price: 15
},

// DF
{
  name: "ナチョ",
  position: "DF",
  price: 30
},
{
  name: "リュディガー",
  position: "DF",
  price: 45
},
{
  name: "ミリトン",
  position: "DF",
  price: 60
},
{
  name: "アラバ",
  position: "DF",
  price: 55
},
{
  name: "ハイセン",
  position: "DF",
  price: 50
},
{
  name: "コナテ",
  position: "DF",
  price: 40
},
{
  name: "アセンシオ",
  position: "DF",
  price: 35
},
{
  name: "バスケス",
  position: "DF",
  price: 20
},
{
  name: "カルバハル",
  position: "DF",
  price: 60
},
{
  name: "トレント",
  position: "DF",
  price: 55
},
{
  name: "ドゥンフリース",
  position: "DF",
  price: 35
},
{
  name: "フラン",
  position: "DF",
  price: 15
},
{
  name: "メンディ",
  position: "DF",
  price: 45
},
{
  name: "カレーラス",
  position: "DF",
  price: 50
},
{
  name: "ククレジャ",
  position: "DF",
  price: 60
},

// MF
{
  name: "クロース",
  position: "MF",
  price: 110
},
{
  name: "モドリッチ",
  position: "MF",
  price: 120
},
{
  name: "カマヴィンガ",
  position: "MF",
  price: 70
},
{
  name: "チュアメニ",
  position: "MF",
  price: 80
},
{
  name: "バルベルデ",
  position: "MF",
  price: 100
},
{
  name: "ベリンガム",
  position: "MF",
  price: 160
},
{
  name: "セバージョス",
  position: "MF",
  price: 35
},
{
  name: "ギュレル",
  position: "MF",
  price: 60
},
{
  name: "ピタルチ",
  position: "MF",
  price: 20
},
{
  name: "ベルナルド",
  position: "MF",
  price: 65
},

// FW
{
  name: "ヴィニシウス",
  position: "FW",
  price: 140
},
{
  name: "ロドリゴ",
  position: "FW",
  price: 75
},
{
  name: "エンバペ",
  position: "FW",
  price: 180
},
{
  name: "ホセル",
  position: "FW",
  price: 10
},
{
  name: "ブラヒム",
  position: "FW",
  price: 45
},
{
  name: "エンドリッキ",
  position: "FW",
  price: 40
},
{
  name: "マスタントゥオーノ",
  position: "FW",
  price: 35
},
{
  name: "ゴンサロ",
  position: "FW",
  price: 25
},
{
  name: "ディオマンデ",
  position: "FW",
  price: 80
},
{
  name: "エスピ",
  position: "FW",
  price: 20
}

])

// ========================================
// カード画像
// ========================================

const CARD_BUCKET = "player-cards"

const CARD_FILES = {
  "クルトワ": "01.jpg",
  "ルニン": "02.jpg",
  "ケパ": "03.jpg",
  "ナチョ": "04.jpg",
  "リュディガー": "05.jpg",
  "ミリトン": "06.jpg",
  "アラバ": "07.jpg",
  "ハイセン": "08.jpg",
  "コナテ": "09.jpg",
  "アセンシオ": "10.jpg",
  "バスケス": "11.jpg",
  "カルバハル": "12.jpg",
  "トレント": "13.jpg",
  "ドゥンフリース": "14.jpg",
  "フラン": "15.jpg",
  "メンディ": "16.jpg",
  "カレーラス": "17.jpg",
  "ククレジャ": "18.jpg",
  "クロース": "19.jpg",
  "モドリッチ": "20.jpg",
  "カマヴィンガ": "21.jpg",
  "チュアメニ": "22.jpg",
  "バルベルデ": "23.jpg",
  "ベリンガム": "24.jpg",
  "セバージョス": "25.jpg",
  "ギュレル": "26.jpg",
  "ピタルチ": "27.jpg",
  "ベルナルド": "28.jpg",
  "ヴィニシウス": "29.jpg",
  "ロドリゴ": "30.jpg",
  "エンバペ": "31.jpg",
  "ホセル": "32.jpg",
  "ブラヒム": "33.jpg",
  "エンドリッキ": "34.jpg",
  "マスタントゥオーノ": "35.jpg",
  "ゴンサロ": "36.jpg",
  "ディオマンデ": "37.jpg",
  "エスピ": "38.jpg"
}

const CARD_BASE_URL =
  "https://xiqfsqqyztofrtzkbowo.supabase.co/storage/v1/object/public/player-cards"

const CARD_IMAGES = Object.fromEntries(
  Object.entries(CARD_FILES).map(([name, file]) => [
    name,
    `${CARD_BASE_URL}/${file}`
  ])
)

// ゲーム開始前にカード画像を準備しておく
const cardImagesReady = ref(false)
let cardImagesLoadPromise = null

function getPlayerImage(player) {
  return player?.image || CARD_IMAGES[player?.name] || ""
}

players.value = players.value.map(player => ({
  ...player,
  image: CARD_IMAGES[player.name] || ""
}))

// StackBlitzのプレビュー環境で外部画像がimgタグから
// 正しく表示されない場合に備えて、画像を一度Blobとして取得し、
// ブラウザ内のURLに変換してから使用する。
async function loadCardImages() {
  // 同時に何度も読み込まない
  if (cardImagesLoadPromise) {
    return cardImagesLoadPromise
  }

  cardImagesLoadPromise = (async () => {
    await Promise.all(
      Object.entries(CARD_IMAGES).map(async ([name, url]) => {
        try {
          const response = await fetch(url, {
            mode: "cors",
            cache: "force-cache"
          })

          if (!response.ok) {
            throw new Error(`画像取得失敗: ${response.status}`)
          }

          const blob = await response.blob()

          if (!blob.type.startsWith("image/")) {
            throw new Error(`画像ではないレスポンス: ${blob.type}`)
          }

          const localUrl = URL.createObjectURL(blob)
          CARD_IMAGES[name] = localUrl

          players.value = players.value.map(player =>
            player.name === name ? { ...player, image: localUrl } : player
          )

          myPlayers.value = myPlayers.value.map(player =>
            player.name === name ? { ...player, image: localUrl } : player
          )

          candidates.value = candidates.value.map(player =>
            player.name === name ? { ...player, image: localUrl } : player
          )
        } catch (error) {
          console.error(`カード画像の読み込みに失敗しました: ${name}`, error)
        }
      })
    )

    // 読み込みが終わったらゲーム開始ボタンを有効化
    cardImagesReady.value = true
  })()

  return cardImagesLoadPromise
}


// ========================================
// 自分の選手
// ========================================

const myPlayers =
ref([])


// ========================================
// スカウト候補
// ========================================

const candidates =
ref([])


// ========================================
// 選択中の獲得候補
// ========================================

const selectedCandidate =
ref(null)


// ========================================
// 放出選手選択画面
// ========================================

const selectingPlayerToSell =
ref(false)


// ========================================
// スカウト種類
// ========================================

const scoutTypes = [

{
  id: "GK",
  name: "🧤 GK補強",
  description: "GKを探す",
  position: "GK",
  count: 1
},

{
  id: "DF",
  name: "🛡️ DF補強",
  description: "DFを探す",
  position: "DF",
  count: 2
},

{
  id: "MF",
  name: "⚙️ MF補強",
  description: "MFを探す",
  position: "MF",
  count: 2
},

{
  id: "FW",
  name: "⚡ FW補強",
  description: "FWを探す",
  position: "FW",
  count: 2
},

{
  id: "cheap",
  name: "💰 格安補強",
  description: "低価格の選手を探す",
  type: "cheap",
  count: 3
},

{
  id: "stable",
  name: "⚖️ 安定補強",
  description: "中価格帯の選手を探す",
  type: "stable",
  count: 3
},

{
  id: "star",
  name: "⭐ スター補強",
  description: "スター選手を探す",
  type: "star",
  count: 1
}

]


// ========================================
// スカウト
// ========================================

function scoutPlayers(scout) {

if (turns.value <= 0) {
  return
}

let scoutConfirmText = ""

if (scout.position) {
  scoutConfirmText = `${scout.position}のスカウトを行いますか？`
} else if (scout.type === "cheap") {
  scoutConfirmText = "格安な選手のスカウトを行いますか？"
} else if (scout.type === "stable") {
  scoutConfirmText = "中価格帯な選手のスカウトを行いますか？"
} else if (scout.type === "star") {
  scoutConfirmText = "スター選手のスカウトを行いますか？"
}

const confirmed = window.confirm(scoutConfirmText)

if (!confirmed) {
  return
}

let available =
  players.value.filter(
    player =>
      !myPlayers.value.some(
        owned =>
          owned.name === player.name
      )
  )


// ポジション指定
if (scout.position) {

  available =
    available.filter(
      player =>
        player.position === scout.position
    )

}


// 格安
if (scout.type === "cheap") {

  available =
    available.filter(
      player =>
        player.price < 50
    )

}


// 安定
if (scout.type === "stable") {

  available =
    available.filter(
      player =>
        player.price >= 50 &&
        player.price < 100
    )

}


// スター
if (scout.type === "star") {

  available =
    available.filter(
      player =>
        player.price >= 100
    )

}


// ランダム
available =
  [...available]
    .sort(
      () =>
        Math.random() - 0.5
    )


candidates.value =
  available.slice(
    0,
    scout.count
  )


// スカウトで1ターン消費
turns.value--


// 10ターン目のスカウトが終わったら自動でゲーム終了
if (turns.value <= 0) {
  setTimeout(() => {
    finishGame()
  }, 500)
}
}


// ========================================
// 候補選手を選択
// ========================================

function selectCandidate(player) {

if (turns.value <= 0) {
  return
}

selectedCandidate.value =
  player

selectingPlayerToSell.value =
  true

}


// ========================================
// 獲得しない
// ========================================

function cancelAcquire() {

selectedCandidate.value =
  null

selectingPlayerToSell.value =
  false

}


// ========================================
// 選手獲得
// ========================================

function acquirePlayer(playerToSell) {

if (!selectedCandidate.value) {
  return
}

const candidate =
  selectedCandidate.value


const newMoney =
  money.value -
  candidate.price +
  playerToSell.price


// 予算不足
if (newMoney < 0) {

  alert(
    `予算が足りません。\n\n` +
    `現在の予算：${money.value}M€\n` +
    `放出額：${playerToSell.price}M€\n` +
    `獲得費用：${candidate.price}M€`
  )

  return
}


// 選手入れ替え
myPlayers.value =
  myPlayers.value.map(
    player =>
      player.name === playerToSell.name
        ? candidate
        : player
  )


// お金更新
money.value =
  newMoney


// 獲得で1ターン消費
turns.value--


// 候補をリセット
candidates.value = []

selectedCandidate.value =
  null

selectingPlayerToSell.value =
  false


// ターン終了
if (turns.value <= 0) {

  setTimeout(() => {
    finishGame()
  }, 300)

}

}


// ========================================
// 初期チーム作成
// ========================================

function getRandomPlayers(position, count) {

const pool =
  players.value.filter(
    player =>
      player.position === position
  )

return [...pool]
  .sort(
    () =>
      Math.random() - 0.5
  )
  .slice(0, count)
}


async function startGame() {

  if (revealTimer) {
    clearInterval(revealTimer)
    revealTimer = null
  }

  // 念のため、カード画像の準備が終わってからゲームを開始
  await loadCardImages()

  // ゲーム開始を1プレイとして記録
  const { error: playError } = await supabase
    .from("game_plays")
    .insert({ user_id: userId.value })

  if (playError) {
    console.error("プレイ記録エラー:", playError)
  }

gameStarted.value =
  true

teamBuilding.value =
  false

teamCompleted.value =
  false

postCompleted.value =
  false

showPosts.value =
  false

money.value =
  GAME_SETTINGS.INITIAL_MONEY

turns.value =
  GAME_SETTINGS.MAX_TURNS

candidates.value =
  []

selectedCandidate.value =
  null

selectingPlayerToSell.value =
  false


const initialTeam = [

  ...getRandomPlayers(
    "GK",
    GAME_SETTINGS.INITIAL_TEAM.GK
  ),

  ...getRandomPlayers(
    "DF",
    GAME_SETTINGS.INITIAL_TEAM.DF
  ),

  ...getRandomPlayers(
    "MF",
    GAME_SETTINGS.INITIAL_TEAM.MF
  ),

  ...getRandomPlayers(
    "FW",
    GAME_SETTINGS.INITIAL_TEAM.FW
  )

]


myPlayers.value =
  initialTeam

lineup.value = {}
selectedSlot.value = null
currentFormation.value = "4-3-3"

revealedPlayers.value = initialTeam
revealIndex.value = 0
revealStarted.value = false
initialReveal.value = true

}

function revealNextPlayer() {

  if (!initialReveal.value || revealStarted.value) {
    return
  }

  revealStarted.value = true
  revealIndex.value = 0

  // 最初の1人を表示したあと、自動で順番に公開する
  revealTimer = setInterval(() => {
    if (!initialReveal.value) {
      clearInterval(revealTimer)
      revealTimer = null
      return
    }

    if (revealIndex.value < 10) {
      revealIndex.value++
      return
    }

    clearInterval(revealTimer)
    revealTimer = null

    // 最後のカードを少し見せてからスカウト画面へ
    setTimeout(() => {
      if (!initialReveal.value) {
        return
      }

      initialReveal.value = false
      revealIndex.value = 0
      revealStarted.value = false
    }, 900)
  }, 1100)
}


// ========================================
// ゲーム終了
// ========================================

function finishGame() {

  initialReveal.value = false

  if (myPlayers.value.length !== 11) {

    alert(
      "11人の選手を揃えてください。"
    )

    return
  }

  candidates.value = []
  selectedCandidate.value = null
  selectingPlayerToSell.value = false

  teamBuilding.value = true

}


// ========================================
// フォーメーション
// ========================================

const formations = [

"4-2-3-1",
"4-3-3",
"4-4-2",
"4-3-1-2",
"4-3-2-1",
"3-2-4-1",
"3-5-2",
"3-4-3"

]


const currentFormation =
ref("4-3-3")

const selectedSlot =
ref(null)

const lineup =
ref({})


// ========================================
// フォーメーション位置
// ========================================

const formationPositions = {

"4-2-3-1": [
  { id: "GK", x: 50, y: 91 },
  { id: "LB", x: 12, y: 72 },
  { id: "LCB", x: 38, y: 76 },
  { id: "RCB", x: 62, y: 76 },
  { id: "RB", x: 88, y: 72 },
  { id: "LDM", x: 38, y: 55 },
  { id: "RDM", x: 62, y: 55 },
  { id: "LAM", x: 18, y: 34 },
  { id: "CAM", x: 50, y: 29 },
  { id: "RAM", x: 82, y: 34 },
  { id: "ST", x: 50, y: 10 }
],

"4-3-3": [
  { id: "GK", x: 50, y: 91 },
  { id: "LB", x: 12, y: 72 },
  { id: "LCB", x: 38, y: 76 },
  { id: "RCB", x: 62, y: 76 },
  { id: "RB", x: 88, y: 72 },
  { id: "LCM", x: 28, y: 46 },
  { id: "CM", x: 50, y: 55 },
  { id: "RCM", x: 72, y: 46 },
  { id: "LW", x: 18, y: 22 },
  { id: "ST", x: 50, y: 13 },
  { id: "RW", x: 82, y: 22 }
],

"4-4-2": [
  { id: "GK", x: 50, y: 91 },
  { id: "LB", x: 12, y: 72 },
  { id: "LCB", x: 38, y: 76 },
  { id: "RCB", x: 62, y: 76 },
  { id: "RB", x: 88, y: 72 },
  { id: "LM", x: 12, y: 47 },
  { id: "LCM", x: 38, y: 52 },
  { id: "RCM", x: 62, y: 52 },
  { id: "RM", x: 88, y: 47 },
  { id: "LST", x: 38, y: 15 },
  { id: "RST", x: 62, y: 15 }
],

"4-3-1-2": [
  { id: "GK", x: 50, y: 91 },
  { id: "LB", x: 12, y: 72 },
  { id: "LCB", x: 38, y: 76 },
  { id: "RCB", x: 62, y: 76 },
  { id: "RB", x: 88, y: 72 },
  { id: "LCM", x: 27, y: 42 },
  { id: "CM", x: 50, y: 49 },
  { id: "RCM", x: 73, y: 42 },
  { id: "CAM", x: 50, y: 31 },
  { id: "LST", x: 38, y: 13 },
  { id: "RST", x: 62, y: 13 }
],

"4-3-2-1": [
  { id: "GK", x: 50, y: 91 },
  { id: "LB", x: 12, y: 72 },
  { id: "LCB", x: 38, y: 76 },
  { id: "RCB", x: 62, y: 76 },
  { id: "RB", x: 88, y: 72 },
  { id: "LCM", x: 27, y: 53 },
  { id: "CM", x: 50, y: 57 },
  { id: "RCM", x: 73, y: 53 },
  { id: "LAM", x: 38, y: 31 },
  { id: "RAM", x: 62, y: 31 },
  { id: "ST", x: 50, y: 10 }
],

"3-2-4-1": [
  { id: "GK", x: 50, y: 91 },
  { id: "LCB", x: 25, y: 76 },
  { id: "CB", x: 50, y: 76 },
  { id: "RCB", x: 75, y: 76 },
  { id: "LDM", x: 38, y: 56 },
  { id: "RDM", x: 62, y: 56 },
  { id: "LWB", x: 10, y: 34 },
  { id: "LAM", x: 38, y: 30 },
  { id: "RAM", x: 62, y: 30 },
  { id: "RWB", x: 90, y: 34 },
  { id: "ST", x: 50, y: 10 }
],

"3-5-2": [
  { id: "GK", x: 50, y: 91 },
  { id: "LCB", x: 25, y: 76 },
  { id: "CB", x: 50, y: 76 },
  { id: "RCB", x: 75, y: 76 },
  { id: "LWB", x: 10, y: 52 },
  { id: "LCM", x: 32, y: 54 },
  { id: "CM", x: 50, y: 43 },
  { id: "RCM", x: 68, y: 54 },
  { id: "RWB", x: 90, y: 52 },
  { id: "LST", x: 38, y: 15 },
  { id: "RST", x: 62, y: 15 }
],

"3-4-3": [
  { id: "GK", x: 50, y: 91 },
  { id: "LCB", x: 25, y: 76 },
  { id: "CB", x: 50, y: 76 },
  { id: "RCB", x: 75, y: 76 },
  { id: "LM", x: 12, y: 51 },
  { id: "LCM", x: 38, y: 53 },
  { id: "RCM", x: 62, y: 53 },
  { id: "RM", x: 88, y: 51 },
  { id: "LW", x: 18, y: 22 },
  { id: "ST", x: 50, y: 12 },
  { id: "RW", x: 82, y: 22 }
]

}


// ========================================
// フォーメーションスロット
// ========================================

const formationSlots =
computed(() => {

  return formationPositions[
    currentFormation.value
  ].map(slot => ({

    ...slot,

    style: {
      left: `${slot.x}%`,
      top: `${slot.y}%`
    }

  }))

})

function getPostPlayerStyle(player, formation, index) {

  const slots = formationPositions[formation] || []

  // 投稿データは formationSlots の順番で保存されているので、
  // indexを基本にして必ず11人を正しい場所へ配置する。
  const slot = slots[index]

  if (!slot) {
    return {
      left: "50%",
      top: "50%"
    }
  }

  return {
    left: `${slot.x}%`,
    top: `${slot.y}%`
  }
}


// ========================================
// 選手配置
// ========================================

const selectablePlayers =
computed(() =>
  myPlayers.value
)


const placedPlayers =
computed(() =>
  Object.values(lineup.value)
)


const isTeamComplete =
computed(() =>
  Object.keys(lineup.value).length === 11
)


function changeFormation(formation) {

currentFormation.value =
  formation

lineup.value =
  {}

selectedSlot.value =
  null

}


function selectSlot(slotId) {

selectedSlot.value =
  slotId

}


function placePlayer(player) {

if (!selectedSlot.value) {
  return
}


// すでに配置されている選手は不可
if (
  placedPlayers.value.some(
    placed =>
      placed.name === player.name
  )
) {

  return
}


lineup.value = {

  ...lineup.value,

  [selectedSlot.value]:
    player

}


selectedSlot.value =
  null

}


// ========================================
// チーム完成
// ========================================

function completeTeam() {

if (!isTeamComplete.value) {
  return
}

teamCompleted.value =
  true

}


// ========================================
// 投稿
// ========================================

const isPosting =
ref(false)

const postedPost =
ref(null)


async function postTeam() {

if (!isTeamComplete.value) {
  return
}


isPosting.value =
  true


const postPlayers =
  formationSlots.value.map(
    slot => ({

      id: slot.id,

      name:
        lineup.value[slot.id]?.name,

      image:
        getPlayerImage(lineup.value[slot.id]),

      style:
        slot.style

    })
  )


const { data, error } =
  await supabase
    .from("posts")
    .insert({

      user_id:
        userId.value,

      formation:
        currentFormation.value,

      money:
        money.value,

      players:
        postPlayers,

      likes: 0,

      views: 0

    })
    .select()
    .single()


isPosting.value =
  false


if (error) {

  console.error(error)

  alert(
    "投稿に失敗しました。\n" +
    error.message
  )

  return

}


postCompleted.value =
  true

selectedPost.value =
  data

// 投稿ごとの固有URLを作成
if (data?.id) {
  const url =
    `${window.location.origin}${window.location.pathname}?post=${data.id}`

  window.history.replaceState(
    {},
    "",
    `?post=${data.id}`
  )
}

}


// ========================================
// 投稿一覧
// ========================================

const posts =
ref([])

const loadingPosts =
ref(false)

const postSort =
ref("popular")

// ユーザーごとに「いいね済み」の投稿IDを保存
function loadLikedPostIds() {
  try {
    const saved = localStorage.getItem(
      `bestXI_likedPosts_${userId.value}`
    )
    return new Set(
      saved ? JSON.parse(saved).map(String) : []
    )
  } catch {
    return new Set()
  }
}

const likedPostIds =
ref(loadLikedPostIds())

const likingPostId =
ref(null)

function hasLiked(post) {
  return likedPostIds.value.has(
    String(post.id)
  )
}

function saveLikedPostIds() {
  localStorage.setItem(
    `bestXI_likedPosts_${userId.value}`,
    JSON.stringify([...likedPostIds.value])
  )
}


async function fetchPosts() {

loadingPosts.value =
  true


const {
  data,
  error
} = await supabase
  .from("posts")
  .select("*")
  .order(
    "created_at",
    {
      ascending: false
    }
  )


loadingPosts.value =
  false


if (error) {

  console.error(error)

  alert(
    "投稿の読み込みに失敗しました。\n" +
    error.message
  )

  return

}


posts.value =
  data || []

}


// ========================================
// 投稿並び替え
// ========================================

const sortedPosts =
computed(() => {

  const list =
    [...posts.value]


  if (
    postSort.value ===
    "popular"
  ) {

    return list.sort(
      (a, b) =>
        (b.likes || 0) -
        (a.likes || 0)
    )

  }


  return list.sort(
    (a, b) =>
      new Date(
        b.created_at
      ) -
      new Date(
        a.created_at
      )
  )

})


// ========================================
// 投稿削除
// ========================================

async function deletePost(post) {

  if (!post || post.user_id !== userId.value) {
    return
  }

  const confirmed =
    window.confirm("この投稿を削除しますか？")

  if (!confirmed) {
    return
  }

  const { error } =
    await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("user_id", userId.value)

  if (error) {
    console.error("投稿削除エラー:", error)
    alert("投稿の削除に失敗しました。")
    return
  }

  posts.value =
    posts.value.filter(
      item =>
        String(item.id) !==
        String(post.id)
    )

  if (
    selectedPost.value &&
    String(selectedPost.value.id) ===
      String(post.id)
  ) {
    selectedPost.value = null
    clearPostUrl()
  }

  await fetchPosts()
}


// ========================================
// いいね
// ========================================

async function likePost(post) {

  // すでにいいね済み、または処理中なら何もしない
  if (
    hasLiked(post) ||
    likingPostId.value === post.id
  ) {
    return
  }

  likingPostId.value = post.id

  const newLikes =
    (post.likes || 0) + 1

  const {
    error
  } = await supabase
    .from("posts")
    .update({
      likes: newLikes
    })
    .eq(
      "id",
      post.id
    )

  likingPostId.value = null

  if (error) {
    console.error(error)
    alert("いいねに失敗しました。")
    return
  }

  post.likes = newLikes

  // このユーザーはこの投稿にいいね済みとして保存
  likedPostIds.value.add(
    String(post.id)
  )
  likedPostIds.value = new Set(
    likedPostIds.value
  )
  saveLikedPostIds()

}


// ========================================
// 投稿日時
// ========================================

function formatDate(date) {

if (!date) {
  return ""
}


return new Date(date)
  .toLocaleString(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  )

}


// ========================================
// 管理者用画面
// ========================================

async function openAdmin() {
  const adminUserId = window.prompt("管理者ユーザーIDを入力してください")

  if (adminUserId === null) {
    return
  }

  const password = window.prompt("管理者パスワードを入力してください")

  if (adminUserId !== ADMIN_USER_ID || password !== ADMIN_PASSWORD) {
    alert("ユーザーIDまたはパスワードが違います。")
    return
  }

  showAdmin.value = true
  gameStarted.value = false
  await fetchAdminStats()
  await fetchAdminPosts()
}

function closeAdmin() { showAdmin.value = false }

async function fetchAdminPosts() {
  loadingAdminPosts.value = true

  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, user_id, formation, likes, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    adminPosts.value = data || []
  } catch (error) {
    console.error("管理者投稿一覧の取得エラー:", error)
    alert("投稿一覧の取得に失敗しました。\n" + error.message)
  } finally {
    loadingAdminPosts.value = false
  }
}

async function fetchAdminStats() {
  loadingAdmin.value = true
  try {
    const { data: playRows, error: playError } = await supabase
      .from("game_plays")
      .select("user_id, created_at")
    if (playError) throw playError

    const { count: totalPosts, error: postError } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
    if (postError) throw postError

    const rows = playRows || []
    const totalUsers = new Set(rows.map(row => row.user_id).filter(Boolean)).size
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const dailyPlays = rows.filter(row => row.created_at && new Date(row.created_at) >= todayStart).length

    adminStats.value = { totalUsers, totalPlays: rows.length, totalPosts: totalPosts || 0, dailyPlays }
  } catch (error) {
    console.error("管理者統計の取得エラー:", error)
    alert("統計データの取得に失敗しました。\n" + error.message)
  } finally {
    loadingAdmin.value = false
  }
}

// ========================================
// 管理者による個別投稿削除
// ========================================

async function deletePostAsAdmin(post) {
  if (!showAdmin.value || !post || deletingPostId.value !== null) {
    return
  }

  const firstConfirmed = window.confirm(
    `この投稿を削除しますか？\n\nユーザー：${post.user_id}\nフォーメーション：${post.formation}`
  )

  if (!firstConfirmed) {
    return
  }

  const secondConfirmed = window.confirm(
    "本当にこの投稿を削除しますか？\n\n削除した投稿は元に戻せません。"
  )

  if (!secondConfirmed) {
    return
  }

  deletingPostId.value = post.id

  try {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)

    if (error) {
      throw error
    }

    adminPosts.value = adminPosts.value.filter(
      item => String(item.id) !== String(post.id)
    )

    posts.value = posts.value.filter(
      item => String(item.id) !== String(post.id)
    )

    rankingPosts.value = rankingPosts.value.filter(
      item => String(item.id) !== String(post.id)
    )

    if (selectedPost.value && String(selectedPost.value.id) === String(post.id)) {
      selectedPost.value = null
      clearPostUrl()
    }

    await fetchAdminStats()
    alert("投稿を削除しました。")
  } catch (error) {
    console.error("管理者による投稿削除エラー:", error)
    alert("投稿の削除に失敗しました。\n" + error.message)
  } finally {
    deletingPostId.value = null
  }
}


// ========================================
// 管理者による全投稿削除
// ========================================

async function deleteAllPosts() {
  if (deletingAllPosts.value) {
    return
  }

  const firstConfirmed = window.confirm(
    "すべてのユーザーの投稿を削除しますか？\n\nこの操作はすべての投稿に適用されます。"
  )

  if (!firstConfirmed) {
    return
  }

  const secondConfirmed = window.confirm(
    "本当にすべての投稿を削除しますか？\n\n削除した投稿は元に戻せません。"
  )

  if (!secondConfirmed) {
    return
  }

  deletingAllPosts.value = true

  try {
    const { error } = await supabase
      .from("posts")
      .delete()
      .gt("id", 0)

    if (error) {
      throw error
    }

    posts.value = []
    adminPosts.value = []
    rankingPosts.value = []
    selectedPost.value = null
    clearPostUrl()

    await fetchAdminStats()
    alert("すべての投稿を削除しました。")
  } catch (error) {
    console.error("全投稿削除エラー:", error)
    alert("投稿の削除に失敗しました。\n" + error.message)
  } finally {
    deletingAllPosts.value = false
  }
}

// ========================================
// いいねランキング
// ========================================

async function fetchRanking() {
  loadingRanking.value = true

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("likes", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10)

  loadingRanking.value = false

  if (error) {
    console.error("ランキングの取得エラー:", error)
    alert("ランキングの読み込みに失敗しました。\n" + error.message)
    return
  }

  rankingPosts.value = data || []
}

async function openRanking() {
  showRanking.value = true
  showPosts.value = false
  gameStarted.value = false
  selectedPost.value = null
  clearPostUrl()
  await fetchRanking()
}

function closeRanking() {
  showRanking.value = false
}

async function openPostFromRanking(post) {
  showRanking.value = false
  showPosts.value = true
  gameStarted.value = false
  await fetchPosts()
  openPost(post)
}

// ========================================
// 投稿一覧を開く
// ========================================

async function openPosts() {

showRanking.value =
  false

showPosts.value =
  true

showPostDetailFromUrl()

gameStarted.value =
  false

await fetchPosts()

if (selectedPost.value) {
  const found =
    posts.value.find(
      post =>
        String(post.id) ===
        String(selectedPost.value.id)
    )

  if (found) {
    selectedPost.value = found
  }
}

}


// ========================================
// 投稿一覧を閉じる
// ========================================

function closePosts() {

showPosts.value =
  false

showRanking.value =
  false

selectedPost.value =
  null

postedPost.value =
  null

clearPostUrl()

}


// ========================================
// 投稿固有URL・詳細表示
// ========================================

function getPostUrl(postId) {
  return `${window.location.origin}${window.location.pathname}?post=${postId}`
}

function clearPostUrl() {
  if (window.location.search) {
    window.history.replaceState(
      {},
      "",
      window.location.pathname
    )
  }
}

function showPostDetailFromUrl() {
  const params =
    new URLSearchParams(window.location.search)

  const postId =
    params.get("post")

  if (!postId) {
    selectedPost.value = null
    return
  }

  selectedPost.value = {
    id: postId
  }
}

async function openPost(post) {

selectedPost.value =
  post

showPosts.value =
  true

gameStarted.value =
  false

window.history.pushState(
  {},
  "",
  `?post=${post.id}`
)

selectedPost.value =
  post

}

async function loadPostFromUrl() {

const params =
  new URLSearchParams(window.location.search)

const postId =
  params.get("post")

if (!postId) {
  return
}

const { data, error } =
  await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single()

if (error || !data) {
  selectedPost.value = null
  return
}

selectedPost.value =
  data

showPosts.value =
  true

gameStarted.value =
  false


}

async function copyPostUrl(post) {

const url =
  getPostUrl(post.id)

try {
  await navigator.clipboard.writeText(url)
  alert("投稿URLをコピーしました！")
} catch {
  window.prompt(
    "投稿URLをコピーしてください",
    url
  )
}

}

// ========================================
// リセット
// ========================================

function resetGame() {

showAdmin.value = false
initialReveal.value = false
revealedPlayers.value = []
revealIndex.value = 0
revealStarted.value = false

gameStarted.value =
  false

teamBuilding.value =
  false

teamCompleted.value =
  false

postCompleted.value =
  false

showPosts.value =
  false

selectedPost.value =
  null

clearPostUrl()

myPlayers.value =
  []

candidates.value =
  []

selectedCandidate.value =
  null

selectingPlayerToSell.value =
  false

lineup.value =
  {}

selectedSlot.value =
  null

money.value =
  GAME_SETTINGS.INITIAL_MONEY

turns.value =
  GAME_SETTINGS.MAX_TURNS

currentFormation.value =
  "4-3-3"

}

onMounted(async () => {
  await loadCardImages()
  await loadPostFromUrl()
})

</script>


<style scoped>

* {
box-sizing: border-box;
}

.app {
min-height: 100vh;
background:
  linear-gradient(
    135deg,
    #07111f,
    #10243d
  );
color: white;
font-family:
  Arial,
  "Noto Sans JP",
  sans-serif;
}


/* =========================
 共通
========================= */

button {
font-family: inherit;
cursor: pointer;
}

button:disabled {
cursor: not-allowed;
opacity: 0.45;
}


/* =========================
 タイトル
========================= */

.admin-screen { min-height: 100vh; padding: 40px 24px 60px; max-width: 1100px; margin: 0 auto; }
.admin-header { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:36px; }
.admin-header h1 { margin:8px 0 0; font-size:clamp(30px,5vw,48px); }
.admin-back-button,.admin-refresh-button,.admin-title-button { border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:#fff; border-radius:12px; padding:12px 18px; font-weight:800; cursor:pointer; }
.admin-stats-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
.admin-stat-card { min-height:180px; padding:28px; border-radius:20px; background:linear-gradient(145deg,#17263a,#0d1727); border:1px solid rgba(255,255,255,.12); box-shadow:0 18px 45px rgba(0,0,0,.25); display:flex; flex-direction:column; justify-content:center; }
.admin-stat-card span { color:#9eafc3; font-weight:800; font-size:16px; }
.admin-stat-card strong { margin-top:10px; font-size:clamp(42px,7vw,68px); line-height:1; }
.admin-stat-card small { margin-top:8px; color:#9eafc3; font-weight:700; }
.admin-stat-card.highlight { border-color:rgba(255,255,255,.28); }
.admin-loading { text-align:center; padding:80px 20px; color:#9eafc3; }
.admin-refresh-button { display:block; margin:28px auto 0; }
.admin-title-button { display:block; margin:14px auto 0; font-size:13px; opacity:.8; }

.title-screen {
min-height: 100vh;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 30px;
text-align: center;
}

.title-screen h1 {
font-size: 56px;
margin-bottom: 10px;
}

.title-screen p {
color: #b9c6d8;
margin-bottom: 30px;
}

.user-id {
background: rgba(255,255,255,0.08);
padding: 12px 24px;
border-radius: 12px;
margin-bottom: 25px;
}

.start-button {
border: none;
border-radius: 14px;
padding: 18px 55px;
font-size: 20px;
font-weight: bold;
background: #20c997;
color: white;
}

.start-button:hover {
transform: translateY(-2px);
}

.posts-title-button {
margin-top: 15px;
padding: 12px 25px;
border: 1px solid #53657d;
border-radius: 10px;
background: transparent;
color: white;
}


/* =========================
 上部バー
========================= */

.top-bar {
padding: 18px 30px;
display: flex;
justify-content: space-between;
align-items: center;
border-bottom: 1px solid rgba(255,255,255,0.1);
background: rgba(0,0,0,0.2);
}

.top-bar h1 {
margin: 0;
font-size: 25px;
}

.user-area {
display: flex;
gap: 15px;
align-items: center;
}

.money,
.turn {
padding: 8px 14px;
border-radius: 10px;
background: rgba(255,255,255,0.08);
}



.turn {
  font-weight: bold;
  transition: 0.2s;
}

.turn.danger {
  background: rgba(255, 107, 107, 0.18);
  border: 1px solid rgba(255, 107, 107, 0.55);
  color: #ffd1d1;
}

.turn-status {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 14px;
  padding: 10px 18px;
  border-radius: 12px;
  background: rgba(32, 201, 151, 0.12);
  border: 1px solid rgba(32, 201, 151, 0.28);
  color: #c8f5e7;
}

.turn-status strong {
  font-size: 22px;
  color: white;
}

.turn-status span {
  color: #9eb0c4;
}

.candidate-card:disabled {
  cursor: not-allowed;
  opacity: 0.4;
  transform: none;
}

/* =========================
 ゲーム
========================= */

.game-content {
max-width: 1100px;
margin: auto;
padding: 35px 20px 60px;
}

.game-title {
text-align: center;
margin-bottom: 30px;
}

.game-title p {
color: #aebdd0;
}


/* =========================
 スカウト
========================= */

.scout-grid {
display: grid;
grid-template-columns:
  repeat(auto-fit, minmax(180px, 1fr));
gap: 15px;
}

.scout-card {
border: 1px solid #32465f;
border-radius: 15px;
padding: 20px;
text-align: left;
color: white;
background: #14283f;
}

.scout-card:hover:not(:disabled) {
border-color: #20c997;
transform: translateY(-3px);
}

.scout-name {
font-size: 18px;
font-weight: bold;
margin-bottom: 8px;
}

.scout-description {
color: #aebdd0;
min-height: 40px;
}

.scout-count {
margin: 15px 0 5px;
font-size: 22px;
font-weight: bold;
}

.scout-card small {
color: #8294aa;
}


/* =========================
 セクション
========================= */

.candidate-section,
.my-team-section {
margin-top: 40px;
}

.section-title {
margin-bottom: 18px;
}

.section-title h2 {
margin-bottom: 5px;
}

.section-title p {
color: #9eafc3;
}


/* =========================
 候補
========================= */

.candidate-grid {
display: grid;
grid-template-columns:
  repeat(auto-fit, minmax(190px, 1fr));
gap: 15px;
}

.candidate-card {
border: 1px solid #34516c;
border-radius: 15px;
padding: 20px;
background: #19314a;
color: white;
text-align: left;
}

.candidate-card:hover {
border-color: #20c997;
transform: translateY(-3px);
}

.candidate-position {
color: #20c997;
font-weight: bold;
}

.candidate-name {
font-size: 22px;
font-weight: bold;
margin: 10px 0;
}

.candidate-price {
font-size: 18px;
}

.candidate-action {
margin-top: 15px;
color: #7fe3c5;
}


/* =========================
 自分のチーム
========================= */

.my-player-grid {
display: grid;
grid-template-columns:
  repeat(auto-fit, minmax(150px, 1fr));
gap: 10px;
}

.my-player-card {
display: flex;
flex-direction: column;
gap: 5px;
padding: 13px;
border-radius: 12px;
background: rgba(255,255,255,0.07);
}

.my-player-card .position {
color: #20c997;
font-size: 12px;
}

.my-player-card .price {
color: #91a1b4;
font-size: 12px;
}


/* =========================
 ゲーム終了
========================= */

.finish-button {
display: block;
margin: 35px auto 0;
padding: 15px 40px;
border: none;
border-radius: 12px;
background: #20c997;
color: white;
font-weight: bold;
font-size: 17px;
}


/* =========================
 放出選手選択
========================= */

.sell-container {
max-width: 1000px;
margin: auto;
padding: 40px 20px;
}

.sell-header {
text-align: center;
margin-bottom: 25px;
}

.sell-header p {
color: #abbacd;
}

.target-player {
max-width: 400px;
margin: 0 auto 30px;
padding: 20px;
text-align: center;
border-radius: 15px;
background: #19314a;
border: 1px solid #20c997;
}

.target-position {
color: #20c997;
font-weight: bold;
}

.target-name {
font-size: 27px;
font-weight: bold;
margin: 8px;
}

.target-price {
color: #aebdd0;
}

.sell-grid {
display: grid;
grid-template-columns:
  repeat(auto-fit, minmax(160px, 1fr));
gap: 12px;
}

.sell-player {
border: 1px solid #334b64;
border-radius: 12px;
background: #152a40;
color: white;
padding: 16px;
text-align: left;
}

.sell-player:hover {
border-color: #ff6b6b;
background: #20394f;
}

.sell-position {
color: #20c997;
font-size: 12px;
}

.sell-name {
font-weight: bold;
font-size: 18px;
margin: 7px 0;
}

.sell-price {
color: #ffb4b4;
font-size: 13px;
}

.cancel-acquire {
display: block;
margin: 30px auto 0;
padding: 14px 35px;
border: 1px solid #697b90;
border-radius: 10px;
background: transparent;
color: white;
}

.cancel-acquire:hover {
background: rgba(255,255,255,0.08);
}


/* =========================
 チーム編成
========================= */

.team-screen { padding-bottom: 70px; }
.formation-area { width: min(1180px, 94vw); margin: 0 auto; padding: 28px 0 18px; }
.formation-heading { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:18px; }
.eyebrow { display:block; color:#6ee7c5; font-size:11px; font-weight:800; letter-spacing:2px; margin-bottom:5px; }
.formation-heading h2,.selection-header h2 { margin:0; }
.formation-current { display:flex; align-items:center; gap:10px; padding:9px 14px; border:1px solid rgba(255,255,255,0.12); border-radius:10px; background:rgba(255,255,255,0.05); }
.formation-current span { color:#8193aa; font-size:10px; letter-spacing:1px; }
.formation-current strong { font-size:16px; }
.formation-buttons { display:flex; gap:9px; flex-wrap:wrap; }
.formation-buttons button { padding:10px 18px; border:1px solid #42566e; border-radius:10px; background:#102239; color:white; font-weight:700; transition:0.2s; }
.formation-buttons button:hover { border-color:#20c997; }
.formation-buttons button.active { background:#20c997; border-color:#20c997; box-shadow:0 5px 18px rgba(32,201,151,0.22); }
.team-builder { width:min(1180px,94vw); margin:0 auto; display:grid; grid-template-columns:minmax(0,1.55fr) minmax(320px,0.75fr); gap:20px; align-items:start; }
.pitch-panel,.selection-panel { border:1px solid rgba(255,255,255,0.1); border-radius:18px; background:rgba(7,17,31,0.55); box-shadow:0 18px 50px rgba(0,0,0,0.18); }
.pitch-panel { padding:14px; }
.pitch-topline { display:flex; justify-content:space-between; padding:2px 5px 12px; color:#91a1b4; font-size:11px; font-weight:800; letter-spacing:1.5px; }
.pitch { position:relative; width:100%; height:610px; margin:0 auto; border-radius:15px; border:2px solid rgba(255,255,255,0.7); background:repeating-linear-gradient(0deg,#247547 0,#247547 10%,#286f46 10%,#286f46 20%); overflow:hidden; }
.pitch::before,.pitch::after { content:""; position:absolute; left:3%; right:3%; height:1px; background:rgba(255,255,255,0.7); }
.pitch::before { top:3%; } .pitch::after { bottom:3%; }
.pitch-line { position:absolute; background:rgba(255,255,255,0.7); }
.halfway { left:3%; right:3%; top:50%; height:1px; }
.pitch-circle { position:absolute; width:23%; aspect-ratio:1; left:50%; top:50%; transform:translate(-50%,-50%); border:1px solid rgba(255,255,255,0.7); border-radius:50%; }
.pitch-center-dot { position:absolute; width:7px; height:7px; left:50%; top:50%; transform:translate(-50%,-50%); border-radius:50%; background:white; }
.pitch-box { position:absolute; left:25%; width:50%; height:16%; border:1px solid rgba(255,255,255,0.7); }
.pitch-box-top { top:3%; } .pitch-box-bottom { bottom:3%; }
.pitch-goal { position:absolute; left:42%; width:16%; height:3%; border:1px solid rgba(255,255,255,0.7); }
.pitch-goal-top { top:0; } .pitch-goal-bottom { bottom:0; }
.slot { position:absolute; transform:translate(-50%,-50%); width:88px; height:76px; display:flex; justify-content:center; align-items:center; border-radius:14px; border:2px dashed rgba(255,255,255,0.65); transition:0.18s; cursor:pointer; }
.slot:hover { background:rgba(255,255,255,0.08); transform:translate(-50%,-50%) scale(1.04); }
.slot.selected { border-style:solid; border-color:#ffe066; background:rgba(255,224,102,0.14); box-shadow:0 0 0 4px rgba(255,224,102,0.08); }
.slot.filled { border-color:transparent; }
.empty-slot { width:36px; height:36px; display:flex; justify-content:center; align-items:center; border-radius:50%; background:rgba(0,0,0,0.32); color:rgba(255,255,255,0.85); font-size:25px; }
.player-shirt { width:29px; height:29px; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; border-radius:8px 8px 10px 10px; background:#20c997; color:#062018; font-size:8px; font-weight:900; }
.placed-player span { display:block; max-width:95px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; font-weight:800; }
.selection-panel { padding:20px; position:sticky; top:15px; }
.selection-header p { margin:7px 0 0; color:#8fa0b5; font-size:13px; }
.selected-position { margin:18px 0 12px; padding:10px 12px; border-radius:9px; background:rgba(32,201,151,0.1); color:#9aafc3; font-size:12px; }
.selected-position strong { color:#6ee7c5; margin-left:5px; }
.select-player-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; max-height:505px; overflow-y:auto; padding-right:2px; }
.select-player { min-height:82px; padding:10px; border:1px solid #354b63; border-radius:11px; background:#13283f; color:white; text-align:left; transition:0.18s; }
.select-player:hover:not(:disabled) { border-color:#20c997; transform:translateY(-2px); }
.select-player-position,.select-player-name,.select-player small { display:block; }
.select-player-position { color:#20c997; font-size:10px; font-weight:800; }
.select-player-name { margin:5px 0 3px; font-size:14px; font-weight:800; }
.select-player small { color:#8193aa; font-size:10px; }
.select-player.disabled { opacity:0.22; }
.selection-tip { margin-top:14px; padding:11px; border-radius:9px; background:rgba(255,255,255,0.04); color:#8193aa; font-size:11px; line-height:1.5; }
.complete-button { display:block; margin:25px auto 0; padding:16px 50px; border:none; border-radius:12px; background:#20c997; color:white; font-size:17px; font-weight:bold; box-shadow:0 8px 24px rgba(32,201,151,0.2); }

/* =========================
 完成画面
========================= */

.complete-screen,
.post-screen {
min-height: 100vh;
padding: 50px 20px;
text-align: center;
}

.complete-screen h1 {
font-size: 40px;
}

.team-info {
max-width: 500px;
margin: 20px auto;
display: flex;
justify-content: center;
gap: 50px;
}

.final-pitch {
  position: relative;
  width: min(760px, 92vw);
  height: 610px;
  margin: 28px auto;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.72);
  border-radius: 18px;
  background: repeating-linear-gradient(0deg, #247547 0, #247547 10%, #286f46 10%, #286f46 20%);
  box-shadow: 0 22px 55px rgba(0,0,0,0.28);
}

.final-pitch::before {
  content: "";
  position: absolute;
  left: 3%;
  right: 3%;
  top: 50%;
  border-top: 2px solid rgba(255,255,255,0.65);
}

.final-pitch::after {
  content: "";
  position: absolute;
  width: 23%;
  aspect-ratio: 1;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid rgba(255,255,255,0.65);
  border-radius: 50%;
}

.final-slot {
  position: absolute;
  z-index: 2;
  transform: translate(-50%, -50%);
  width: 96px;
  min-height: 78px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.final-player {
  min-width: 88px;
  padding: 7px 7px 8px;
  border-radius: 13px;
  background: rgba(5,13,24,0.92);
  border: 1px solid rgba(255,255,255,0.25);
  text-align: center;
  box-shadow: 0 7px 20px rgba(0,0,0,0.3);
}

.player-icon {
  width: 34px;
  height: 34px;
  margin: 0 auto 5px;
  display: grid;
  place-items: center;
  border-radius: 9px 9px 11px 11px;
  background: #20c997;
  color: #062018;
  font-size: 17px;
}

.final-player span {
  display: block;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 800;
}

.team-info div {
display: flex;
flex-direction: column;
gap: 5px;
}

.team-info span {
color: #8294aa;
font-size: 12px;
}

.post-button {
padding: 16px 45px;
border: none;
border-radius: 12px;
background: #20c997;
color: white;
font-size: 17px;
font-weight: bold;
}


/* =========================
 投稿
========================= */

.post-success {
max-width: 700px;
margin: auto;
}

.success-icon {
width: 70px;
height: 70px;
margin: 0 auto 15px;
border-radius: 50%;
display: flex;
justify-content: center;
align-items: center;
background: #20c997;
font-size: 35px;
}

.post-card {
margin: 30px auto;
padding: 20px;
border-radius: 15px;
background: #14283f;
text-align: left;
}

.post-header {
display: flex;
justify-content: space-between;
}

.post-header div {
display: flex;
gap: 10px;
}

.post-header span {
color: #20c997;
}

.post-formation {
margin: 20px 0;
font-size: 22px;
font-weight: bold;
}

.post-players {
display: grid;
grid-template-columns:
  repeat(2, 1fr);
gap: 8px;
}

.post-player {
padding: 8px;
border-radius: 8px;
background: rgba(255,255,255,0.06);
}

.post-info {
margin-top: 20px;
display: flex;
gap: 20px;
color: #9eafc3;
}

.post-actions {
display: flex;
justify-content: center;
gap: 10px;
flex-wrap: wrap;
}

.list-button,
.again-button {
padding: 13px 25px;
border-radius: 10px;
border: none;
color: white;
}

.list-button {
background: #2563eb;
}

.again-button {
background: #475569;
}


/* =========================
 投稿一覧
========================= */

.posts-screen {
min-height: 100vh;
padding-bottom: 50px;
}

.post-list-title {
text-align: center;
padding: 30px 20px 15px;
}

.post-list-title p {
color: #9eafc3;
}

.sort-buttons {
display: flex;
justify-content: center;
gap: 10px;
margin-bottom: 25px;
}

.sort-buttons button {
padding: 10px 20px;
border: 1px solid #42566e;
border-radius: 10px;
background: transparent;
color: white;
}

.sort-buttons button.active {
background: #20c997;
border-color: #20c997;
}

.posts {
max-width: 900px;
margin: auto;
padding: 0 20px;
}

.post-item {
margin-bottom: 20px;
padding: 20px;
border-radius: 15px;
background: #14283f;
}

.post-item-header {
display: flex;
justify-content: space-between;
}

.post-item-header div {
display: flex;
gap: 10px;
}

.post-item-header span {
color: #20c997;
}

.post-item-header small {
color: #8294aa;
}

.post-item-formation {
margin: 15px 0;
font-size: 20px;
font-weight: bold;
}

.mini-pitch {
position: relative;
height: 260px;
border-radius: 12px;
background: #286f46;
border: 2px solid rgba(255,255,255,0.5);
}

.mini-player {
position: absolute;
transform: translate(-50%, -50%);
padding: 5px 8px;
border-radius: 7px;
background: rgba(0,0,0,0.75);
font-size: 11px;
white-space: nowrap;
}

/* 投稿一覧：選手画像は使わず、名前を白い楕円で表示 */
.mini-player {
  width: auto !important;
  height: auto !important;
  min-width: 0 !important;
  padding: 5px 10px !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  color: #111827 !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  line-height: 1.2 !important;
  white-space: nowrap !important;
  box-sizing: border-box !important;
  box-shadow: 0 2px 7px rgba(0,0,0,0.18);
  cursor: pointer;
}

.mini-pitch {
  cursor: pointer;
}

.post-player-name {
  display: inline-block;
  padding: 7px 12px;
  border-radius: 999px;
  background: #ffffff;
  color: #111827;
  font-weight: 800;
  font-size: 13px;
  line-height: 1.2;
}


.post-item-info {
display: flex;
align-items: center;
gap: 20px;
margin-top: 15px;
}

.like-button {
border: none;
border-radius: 8px;
padding: 7px 12px;
background: #263b53;
color: white;
}

.back-button {
display: block;
margin: 30px auto;
padding: 12px 30px;
border: 1px solid #53657d;
border-radius: 10px;
background: transparent;
color: white;
}

.loading,
.no-post {
text-align: center;
padding: 50px;
color: #9eafc3;
}



/* =========================
 投稿詳細・共有
========================= */

.clickable-post {
  cursor: pointer;
}

.clickable-post:hover {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.25);
}

.post-list-content {
  width: 100%;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
}

.detail-back {
  margin: 0 0 18px;
}

.post-detail-card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 22px;
}

.detail-pitch {
  position: relative;
  height: 520px;
  margin: 18px 0;
  border-radius: 16px;
  overflow: hidden;
  background: #286f46;
  border: 2px solid rgba(255,255,255,0.5);
}

.detail-pitch::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 2px solid rgba(255,255,255,0.45);
}

.detail-pitch::after {
  content: "";
  position: absolute;
  width: 110px;
  height: 110px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid rgba(255,255,255,0.45);
  border-radius: 50%;
}

.detail-player {
  position: absolute;
  z-index: 2;
  transform: translate(-50%, -50%);
  min-width: 74px;
  text-align: center;
}

.detail-shirt {
  width: 42px;
  height: 42px;
  margin: 0 auto 4px;
  display: grid;
  place-items: center;
  border-radius: 12px 12px 9px 9px;
  background: rgba(8,18,31,0.9);
  border: 1px solid rgba(255,255,255,0.35);
  font-size: 19px;
}

.detail-player span {
  display: block;
  padding: 3px 6px;
  border-radius: 6px;
  background: rgba(0,0,0,0.72);
  color: white;
  font-size: 10px;
  white-space: nowrap;
}

.share-button {
  width: 100%;
  margin-top: 18px;
  padding: 13px 16px;
  border: 0;
  border-radius: 10px;
  background: #ffffff;
  color: #0b1726;
  font-weight: 800;
  cursor: pointer;
}

.detail-close-button {
  display: block;
  margin: 16px auto 0;
  padding: 12px 34px;
  border: 1px solid #53657d;
  border-radius: 10px;
  background: #ffffff;
  color: #0b1726;
  font-weight: 800;
  cursor: pointer;
}


/* =========================
 初期選手公開
========================= */

.reveal-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px 48px;
  text-align: center;
  background: radial-gradient(circle at top, rgba(37, 99, 235, 0.18), transparent 38%), #08111f;
}

.reveal-header h1 {
  margin: 8px 0;
}

.reveal-header p {
  color: #9eafc3;
}

.reveal-card-wrap {
  width: min(270px, 82vw);
  height: 350px;
  display: grid;
  place-items: center;
  perspective: 1000px;
}

.reveal-card {
  position: relative;
  width: 220px;
  height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: linear-gradient(145deg, #17263a, #0d1727);
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow: 0 25px 60px rgba(0,0,0,0.45);
  animation: reveal-card-in .45s ease both;
}

.reveal-card-shine {
  position: absolute;
  width: 160%;
  height: 40%;
  top: -10%;
  left: -30%;
  transform: rotate(-18deg);
  background: rgba(255,255,255,0.08);
}

.reveal-card-position {
  position: absolute;
  top: 20px;
  left: 22px;
  font-weight: 900;
  font-size: 18px;
}

.reveal-card-icon {
  width: 105px;
  height: 105px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  font-size: 46px;
  margin-bottom: 28px;
}

.reveal-card-name {
  font-size: 30px;
  font-weight: 900;
}

.reveal-card-price {
  margin-top: 12px;
  color: #9eafc3;
  font-weight: 700;
}

.reveal-button {
  min-width: 260px;
  padding: 15px 24px;
  border: 0;
  border-radius: 12px;
  background: white;
  color: #08111f;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 12px 30px rgba(0,0,0,0.25);
}

@keyframes reveal-card-in {
  from { opacity: 0; transform: rotateY(-12deg) translateY(15px) scale(0.96); }
  to { opacity: 1; transform: rotateY(0) translateY(0) scale(1); }
}

/* =========================
 スマホ
========================= */

@media (max-width: 700px) {

  .ranking-item {
    grid-template-columns: 52px 1fr auto;
    gap: 10px;
    padding: 13px 12px;
  }

  .ranking-number {
    width: 42px;
    height: 42px;
    font-size: 18px;
  }

  .ranking-likes strong {
    font-size: 15px;
  }


.title-screen h1 {
  font-size: 40px;
}

.top-bar {
  padding: 15px;
}

.top-bar h1 {
  font-size: 18px;
}

.user-area {
  gap: 5px;
  font-size: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.money,
.turn {
  padding: 5px 8px;
}

.formation-heading {
  align-items: flex-start;
  flex-direction: column;
}

.team-builder {
  grid-template-columns: 1fr;
}

.selection-panel {
  position: static;
}

.pitch,
.final-pitch {
  height: 500px;
}

.slot {
  width: 70px;
  height: 60px;
}

.placed-player {
  min-width: 68px;
}

.placed-player span {
  font-size: 9px;
}

.team-info {
  gap: 25px;
}

}


/* =========================
 レアル・マドリード風 ホワイト×ピンクテーマ
========================= */
.app {
  background: linear-gradient(135deg, #ffffff 0%, #fff7fb 55%, #ffeaf4 100%);
  color: #1b1b24;
}

.title-screen,
.game-screen,
.sell-screen,
.team-screen,
.complete-screen,
.post-screen,
.posts-screen {
  color: #1b1b24;
}

.title-screen h1,
.top-bar h1,
.game-title h2,
.section-title h2,
.sell-header h2,
.formation-heading h2,
.selection-header h2,
.complete-screen h1,
.post-list-title h2 {
  color: #15151c;
}

.title-screen p,
.game-title p,
.section-title p,
.sell-header p,
.selection-header p,
.post-list-title p,
.reveal-header p {
  color: #77727a;
}

.user-id,
.money,
.turn,
.formation-current,
.selection-tip {
  background: #ffffff;
  border: 1px solid #f0d6e2;
  color: #34303a;
  box-shadow: 0 8px 24px rgba(255,105,180,0.08);
}

.start-button,
.finish-button,
.complete-button,
.post-button,
.success-icon,
.formation-buttons button.active,
.sort-buttons button.active {
  background: #ff69b4;
  border-color: #ff69b4;
  color: #ffffff;
}

.start-button:hover,
.finish-button:hover,
.complete-button:hover,
.post-button:hover {
  box-shadow: 0 10px 28px rgba(255,105,180,0.28);
}

.posts-title-button,
.back-button,
.cancel-acquire {
  background: #ffffff;
  border-color: #e8bfd2;
  color: #4a424a;
}

.ranking-title-button {
  margin: 12px auto 0;
  padding: 11px 18px;
  border-radius: 12px;
  border: 1px solid #e8bfd2;
  background: #ffffff;
  color: #4a424a;
  font-weight: 800;
}

.ranking-title-button:hover {
  border-color: #ff69b4;
  color: #d93f8c;
  background: #fff7fb;
}

.ranking-screen {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff8fc 0%, #ffffff 50%, #fff8fc 100%);
  padding-bottom: 50px;
}

.ranking-header {
  text-align: center;
  padding: 36px 20px 22px;
}

.ranking-header h2 {
  margin: 8px 0;
  font-size: clamp(28px, 5vw, 42px);
}

.ranking-header p {
  color: #9e8c97;
  margin: 0;
}

.ranking-list {
  width: min(680px, calc(100% - 24px));
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ranking-item {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid #ead8e2;
  border-radius: 16px;
  background: rgba(255,255,255,.96);
  box-shadow: 0 8px 22px rgba(90, 60, 80, .07);
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}

.ranking-item:hover {
  transform: translateY(-2px);
  border-color: #f0a9c9;
  box-shadow: 0 12px 28px rgba(90, 60, 80, .11);
}

.ranking-number {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff1f7;
  color: #766671;
  font-size: 20px;
}

.ranking-number strong {
  font-size: 20px;
}

.ranking-main {
  min-width: 0;
}

.ranking-user {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ranking-user strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #302932;
}

.ranking-user span {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 7px;
  border-radius: 999px;
  background: #ff69b4;
  color: white;
}

.ranking-formation {
  margin-top: 5px;
  color: #9b8994;
  font-size: 13px;
  font-weight: 700;
}

.ranking-likes {
  min-width: 76px;
  text-align: right;
}

.ranking-likes strong {
  display: block;
  color: #d93f8c;
  font-size: 17px;
}

.ranking-likes small {
  color: #a796a0;
  font-size: 11px;
}

.ranking-loading,
.no-ranking {
  text-align: center;
  padding: 70px 20px;
  color: #9e8c97;
}

.ranking-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
  padding: 0 12px;
  flex-wrap: wrap;
}

.posts-title-button:hover,
.back-button:hover,
.cancel-acquire:hover {
  border-color: #ff69b4;
  color: #d93f8c;
  background: #fff7fb;
}

.top-bar {
  background: rgba(255,255,255,0.92);
  border-bottom-color: #efd8e3;
  box-shadow: 0 4px 18px rgba(80,40,60,0.06);
}

.turn.danger {
  background: #fff0f6;
  border-color: #f3a8ca;
  color: #c5367c;
}

.turn-status {
  background: #fff0f6;
  border-color: #f3c1d8;
  color: #a73d70;
}

.turn-status strong {
  color: #d93f8c;
}

.scout-card,
.candidate-card,
.my-player-card,
.sell-player,
.post-card,
.post-item,
.pitch-panel,
.selection-panel,
.post-detail-card,
.target-player,
.select-player,
.formation-current {
  background: #ffffff;
  color: #29252c;
  border-color: #edd5e0;
  box-shadow: 0 10px 28px rgba(90,45,65,0.07);
}

.scout-card:hover:not(:disabled),
.candidate-card:hover,
.sell-player:hover,
.select-player:hover:not(:disabled) {
  border-color: #ff69b4;
  box-shadow: 0 10px 26px rgba(255,105,180,0.14);
}

.scout-description,
.scout-card small,
.section-title p,
.target-price,
.select-player small,
.post-item-header small,
.post-info,
.post-item-info,
.team-info span,
.reveal-card-price {
  color: #817983;
}

.scout-card,
.candidate-card,
.sell-player,
.select-player,
.like-button {
  color: #29252c;
}

.scout-card:hover:not(:disabled) .scout-name,
.candidate-card:hover .candidate-name {
  color: #d93f8c;
}

.candidate-position,
.my-player-card .position,
.sell-position,
.target-position,
.eyebrow,
.selected-position strong,
.post-header span,
.post-item-header span,
.candidate-action {
  color: #e04491;
}

.selected-position {
  background: #fff1f7;
  border: 1px solid #f2cade;
  color: #77727a;
}

.formation-buttons button {
  background: #ffffff;
  border-color: #e5cbd8;
  color: #3d3740;
}

.formation-buttons button:hover {
  border-color: #ff69b4;
  color: #d93f8c;
}

.formation-buttons button.active {
  box-shadow: 0 6px 18px rgba(255,105,180,0.25);
}

.pitch-panel,
.selection-panel {
  background: rgba(255,255,255,0.92);
}

.pitch-topline {
  color: #8a8089;
}

.slot.selected {
  border-color: #ff69b4;
  background: rgba(255,105,180,0.12);
  box-shadow: 0 0 0 4px rgba(255,105,180,0.10);
}

.player-shirt,
.player-icon {
  background: #ff69b4;
  color: #ffffff;
}

.empty-slot {
  background: rgba(255,255,255,0.86);
  color: #d93f8c;
  border: 1px solid #f1bfd5;
}

.post-card,
.post-item {
  background: #ffffff;
}

.post-player {
  background: #fff5f9;
  color: #3c343b;
  border: 1px solid #f2d8e4;
}

.like-button {
  background: #fff0f6;
  color: #d93f8c;
  border: 1px solid #f2cade;
}

.like-button:hover:not(:disabled) {
  background: #ff69b4;
  color: #ffffff;
}

.like-button.liked {
  background: #ff69b4;
  color: #ffffff;
  border-color: #ff69b4;
  cursor: default;
  opacity: 1;
}

.mini-player,
.detail-shirt {
  background: rgba(255,255,255,0.94);
  color: #3b333a;
  border: 1px solid #edcddd;
}

.share-button {
  background: #ff69b4;
  color: #ffffff;
}

.share-button:hover {
  background: #e958a0;
}

.reveal-screen {
  background: linear-gradient(135deg, #ffffff, #fff0f7);
  color: #1b1b24;
}

.reveal-card {
  background: linear-gradient(145deg, #ffffff, #fff0f7);
  color: #242028;
  border-color: #edcddd;
  box-shadow: 0 25px 60px rgba(110,50,80,0.16);
}

.reveal-card-shine {
  background: rgba(255,105,180,0.10);
}

.reveal-card-icon {
  background: #fff0f6;
  color: #ff69b4;
}

.reveal-card-position {
  color: #d93f8c;
}

.reveal-button {
  background: #ff69b4;
  color: #ffffff;
}

.again-button {
  background: #ffffff;
  color: #4a424a;
  border: 1px solid #e5cbd8;
}

.again-button:hover {
  border-color: #ff69b4;
  color: #d93f8c;
}


/* =========================
   PLAYER CARD IMAGES
========================= */
.reveal-card { width:min(360px,82vw); aspect-ratio:2/3; border-radius:22px; overflow:hidden; background:#0c1726; border:1px solid rgba(255,255,255,.16); box-shadow:0 28px 70px rgba(0,0,0,.45); }
.reveal-card-image { width:100%; height:100%; object-fit:cover; display:block; }
.reveal-card-fallback { width:100%; height:100%; display:grid; place-items:center; font-size:64px; background:linear-gradient(145deg,#152943,#0b1626); }
.candidate-image-wrap,.sell-image-wrap { width:100%; aspect-ratio:2/3; overflow:hidden; border-radius:12px; background:#0d1b2d; margin-bottom:10px; }
.candidate-image,.sell-image { width:100%; height:100%; object-fit:cover; display:block; }
.candidate-image-fallback,.sell-image-fallback { width:100%; height:100%; display:grid; place-items:center; font-size:28px; }
.my-player-image-wrap { width:86px; aspect-ratio:2/3; margin:0 auto 9px; overflow:hidden; border-radius:9px; background:#0d1b2d; }
.my-player-image { width:100%; height:100%; object-fit:cover; display:block; }
.my-player-image-fallback { width:100%; height:100%; display:grid; place-items:center; }
.placed-player-image { width:62px; height:74px; object-fit:cover; border-radius:9px; display:block; margin:0 auto 4px; border:1px solid rgba(255,255,255,.28); }
.select-player-image-wrap { width:52px; height:68px; float:left; margin-right:9px; overflow:hidden; border-radius:8px; background:#0b1828; }
.select-player-image { width:100%; height:100%; object-fit:cover; display:block; }
.select-player-image-fallback { width:100%; height:100%; display:grid; place-items:center; }
.final-player-image { width:76px; height:96px; object-fit:cover; display:block; margin:0 auto 5px; border-radius:9px; border:1px solid rgba(255,255,255,.28); }
.select-player { overflow:hidden; }



/* =========================
   SUPABASE PLAYER CARDS IN POSTS
========================= */
.post-player {
  display: flex;
  align-items: center;
  gap: 10px;
}
.post-player-image {
  width: 58px;
  height: 82px;
  object-fit: cover;
  border-radius: 7px;
  display: block;
}
.post-player-fallback {
  width: 58px;
  height: 82px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #fff0f6;
  color: #ff69b4;
}
.mini-player {
  width: 70px;
  padding: 4px;
  background: transparent;
  border: none;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.mini-player-image {
  width: 58px;
  height: 78px;
  object-fit: cover;
  border-radius: 7px;
  display: block;
  box-shadow: 0 4px 10px rgba(0,0,0,.18);
}
.mini-player-fallback {
  width: 58px;
  height: 78px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #fff;
  color: #ff69b4;
}
.mini-player span {
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  color: #3b333a;
}
.detail-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.detail-player-image {
  width: 82px;
  height: 108px;
  object-fit: cover;
  border-radius: 9px;
  display: block;
  box-shadow: 0 5px 14px rgba(0,0,0,.2);
}
.detail-shirt {
  width: 82px;
  height: 108px;
  display: grid;
  place-items: center;
}

@media (max-width: 700px) {
  .mini-player-image,
  .mini-player-fallback {
    width: 46px;
    height: 62px;
  }
  .mini-player {
    width: 58px;
  }
  .mini-player span {
    max-width: 58px;
    font-size: 9px;
  }
}

/* =========================================================
   FINAL V2
   初期11人 / フォーメーション / 投稿一覧を個別に調整
========================================================= */

/* ---------- Initial 11 players: smaller ---------- */
.reveal-screen .reveal-card-wrap {
  width: min(260px, 78vw) !important;
  height: 360px !important;
}

.reveal-screen .reveal-card {
  width: min(230px, 72vw) !important;
  height: auto !important;
  aspect-ratio: auto !important;
  overflow: hidden !important;
  background: transparent !important;
  border-radius: 18px !important;
}

.reveal-screen .reveal-card-image {
  width: 100% !important;
  height: auto !important;
  aspect-ratio: auto !important;
  object-fit: contain !important;
  object-position: center !important;
  display: block !important;
}

/* ---------- Formation: literally only the card image ---------- */
.slot.filled {
  width: 62px !important;
  height: 78px !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

.slot.filled:hover {
  background: transparent !important;
  box-shadow: none !important;
  transform: translate(-50%, -50%) !important;
}

.placed-player {
  width: 56px !important;
  min-width: 56px !important;
  height: 74px !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  text-align: center !important;
}

.placed-player-image {
  width: 6px !important;
  height: 74px !important;
  object-fit: contain !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 5px !important;
  box-shadow: none !important;
}

.placed-player .player-shirt,
.placed-player span {
  display: none !important;
}

/* ---------- Posts list: clean and all 11 cards ---------- */
.posts-screen {
  background: linear-gradient(180deg, #fff8fc 0%, #fff 46%, #fff8fc 100%) !important;
}

.post-list-title {
  text-align: center !important;
  padding-bottom: 12px !important;
}

.sort-buttons {
  justify-content: center !important;
  gap: 8px !important;
  margin-bottom: 18px !important;
}

.sort-buttons button {
  min-width: 100px !important;
  height: 40px !important;
  border-radius: 11px !important;
  border: 1px solid #e7d0dc !important;
  background: #fff !important;
  color: #766671 !important;
  font-weight: 700 !important;
}

.sort-buttons button.active {
  background: #ff69b4 !important;
  border-color: #ff69b4 !important;
  color: #fff !important;
}

.posts {
  width: min(620px, calc(100% - 24px)) !important;
  max-width: 620px !important;
  margin: 0 auto !important;
  padding: 0 !important;
}

.post-item {
  padding: 12px !important;
  margin-bottom: 14px !important;
  border: 1px solid #efdce6 !important;
  border-radius: 18px !important;
  background: #fff !important;
  box-shadow: 0 7px 20px rgba(92,48,70,.07) !important;
}

.post-item-header {
  margin-bottom: 5px !important;
}

.post-item-formation {
  width: fit-content !important;
  margin: 4px auto 9px !important;
  padding: 4px 10px !important;
  border-radius: 999px !important;
  background: #fff0f6 !important;
  color: #df4793 !important;
  font-size: 10px !important;
  font-weight: 800 !important;
}

/* The post pitch is a compact preview of the exact 11-player formation. */
.mini-pitch {
  position: relative !important;
  width: 100% !important;
  height: 260px !important;
  margin: 0 !important;
  overflow: hidden !important;
  border-radius: 13px !important;
  background: #27764a !important;
}

.mini-player {
  position: absolute !important;
  width: 50px !important;
  height: 66px !important;
  padding: 0 !important;
  margin: 0 !important;
  transform: translate(-50%, -50%) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.mini-player-image,
.mini-player-fallback {
  width: 44px !important;
  height: 62px !important;
  object-fit: contain !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 5px !important;
  box-shadow: 0 2px 7px rgba(0,0,0,.20) !important;
}

.mini-player span {
  display: none !important;
}

.post-item-info {
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
  margin-top: 9px !important;
}

/* ---------- Post detail ---------- */
.post-detail {
  width: min(620px, calc(100% - 24px)) !important;
  max-width: 620px !important;
  margin: 0 auto !important;
  padding-bottom: 30px !important;
}

.post-detail-card {
  padding: 12px !important;
  border: 1px solid #efdce6 !important;
  border-radius: 18px !important;
  background: #fff !important;
  box-shadow: 0 7px 20px rgba(92,48,70,.07) !important;
}

.detail-pitch {
  position: relative !important;
  width: 100% !important;
  height: 350px !important;
  overflow: hidden !important;
  border-radius: 13px !important;
  background: #27764a !important;
}

.detail-player {
  position: absolute !important;
  width: 58px !important;
  height: 78px !important;
  transform: translate(-50%, -50%) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.detail-player-image {
  width: 52px !important;
  height: 72px !important;
  object-fit: contain !important;
  display: block !important;
  border: 0 !important;
  border-radius: 5px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,.20) !important;
}

.detail-player span {
  display: none !important;
}

@media (max-width: 700px) {
  .reveal-screen .reveal-card-wrap {
    width: min(250px, 78vw) !important;
    height: 350px !important;
  }

  .reveal-screen .reveal-card {
    width: min(225px, 72vw) !important;
  }

  .slot.filled {
    width: 58px !important;
    height: 74px !important;
  }

  .placed-player,
  .placed-player-image {
    width: 52px !important;
    height: 70px !important;
  }

  .mini-pitch {
    height: 250px !important;
  }

  .mini-player {
    width: 48px !important;
    height: 64px !important;
  }

  .mini-player-image,
  .mini-player-fallback {
    width: 42px !important;
    height: 59px !important;
  }

  .detail-pitch {
    height: 330px !important;
  }

  .detail-player-image {
    width: 48px !important;
    height: 66px !important;
  }

  .placed-player {
    min-width: 0 !important;
    width: 56px !important;
    height: 74px !important;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  
  .placed-player-image {
    width: 56px !important;
    height: 74px !important;
    object-fit: contain !important;
    display: block !important;
    margin: 0 !important;
  }
  
  .placed-player span {
    display: none !important;
  }
}

/* =========================================================
   POST LIST - MOBILE NAME PILLS
========================================================= */
@media (max-width: 700px) {
  .mini-player {
    width: auto !important;
    height: auto !important;
    padding: 4px 8px !important;
    font-size: 10px !important;
  }

  .mini-player-image,
  .mini-player-fallback {
    display: none !important;
  }

  .post-player-name {
    font-size: 12px;
    padding: 6px 10px;
  }
}

/* =========================================================
   FINAL SCREEN ONLY
   完成画面の選手カードを「カード画像だけ」にする
   ※ゲームロジック・他画面のデザインは変更しない
========================================================= */
.complete-screen .final-player {
  min-width: 0 !important;
  width: auto !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.complete-screen .final-player-image {
  width: 76px !important;
  height: 96px !important;
  object-fit: contain !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 5px !important;
  box-shadow: none !important;
}


/* =========================================================
   TEAM COMPLETE - 投稿する / 投稿しない の選択
   ※この部分以外は変更しない
========================================================= */
.post-choice {
  margin: 25px auto 0;
  text-align: center;
}

.post-choice > p {
  margin: 0 0 12px;
  color: #77727a;
  font-weight: 700;
}

.post-choice-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.post-choice-buttons .post-button {
  width: auto;
  min-width: 180px;
  margin-top: 0;
}

.post-skip-button {
  min-width: 180px;
  padding: 16px 45px;
  border: 1px solid #e5cbd8;
  border-radius: 12px;
  background: #ffffff;
  color: #4a424a;
  font-size: 17px;
  font-weight: bold;
}

.post-skip-button:hover {
  border-color: #ff69b4;
  color: #d93f8c;
  background: #fff7fb;
}

@media (max-width: 700px) {
  .post-choice-buttons {
    flex-direction: column;
    align-items: center;
  }

  .post-choice-buttons .post-button,
  .post-skip-button {
    width: min(320px, 90vw);
  }
}


/* =========================================================
   投稿者本人のみ投稿削除
   ※既存のデザイン・機能は変更しない
========================================================= */
.delete-post-button,
.delete-post-detail-button {
  border: 1px solid #f0c9da;
  border-radius: 8px;
  padding: 7px 12px;
  background: #fff;
  color: #c94a7f;
  font-weight: 700;
  cursor: pointer;
}

.delete-post-button:hover,
.delete-post-detail-button:hover {
  background: #fff0f6;
  border-color: #ff69b4;
  color: #d93f8c;
}

.delete-post-detail-button {
  width: 100%;
  margin-top: 10px;
  padding: 13px 16px;
}

@media (max-width: 700px) {
  .admin-screen { padding:28px 16px 40px; }
  .admin-header { align-items:flex-start; }
  .admin-header h1 { font-size:30px; }
  .admin-stats-grid { grid-template-columns:1fr; }
  .admin-stat-card { min-height:150px; padding:22px; }
}



/* =========================================================
   TEST PLAY POLISH - title / admin / reveal / scout / post
========================================================= */
.title-screen h1 {
  margin-bottom: 22px !important;
  letter-spacing: 1px;
}

.title-screen p {
  margin-top: 0 !important;
}

.title-screen .posts-title-button,
.title-screen .ranking-title-button {
  width: min(310px, 82vw) !important;
  box-sizing: border-box;
}

.admin-title-button {
  color: #77727a !important;
}

.admin-refresh-button {
  color: #77727a !important;
}

.admin-stat-card strong {
  color: #fff !important;
}

.admin-close-button {
  display: block;
  margin: 12px auto 0;
  padding: 12px 30px;
  border: 1px solid #e8bfd2;
  border-radius: 12px;
  background: #fff;
  color: #15151c;
  font-weight: 800;
  cursor: pointer;
}

.admin-close-button:hover {
  border-color: #ff69b4;
  background: #fff7fb;
}

.reveal-header h1 {
  font-family: "Trebuchet MS", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif !important;
  font-weight: 700 !important;
  letter-spacing: .5px;
}

.reveal-screen .reveal-card {
  animation: reveal-card-toward-you .7s cubic-bezier(.2,.75,.25,1) both !important;
  transform-origin: center center;
  backface-visibility: hidden;
}

@keyframes reveal-card-toward-you {
  0% {
    opacity: 0;
    transform: perspective(900px) translateZ(-220px) rotateY(-8deg) scale(.78);
  }
  55% {
    opacity: 1;
    transform: perspective(900px) translateZ(35px) rotateY(3deg) scale(1.04);
  }
  100% {
    opacity: 1;
    transform: perspective(900px) translateZ(0) rotateY(0) scale(1);
  }
}

@media (max-width: 700px) {
  .title-screen h1 {
    margin-bottom: 18px !important;
  }

  /* スマホでも「最初の11人を確認しよう」を1行で表示 */
  .reveal-header h1 {
    font-size: 26px !important;
    white-space: nowrap !important;
  }
}


/* Keep title list buttons identical */
.title-screen .posts-title-button,
.title-screen .ranking-title-button {
  margin: 12px auto 0 !important;
  padding: 12px 25px !important;
  border: 1px solid #e8bfd2 !important;
  border-radius: 10px !important;
  background: #fff !important;
  color: #4a424a !important;
  font-weight: 800 !important;
  cursor: pointer;
}

.title-screen .posts-title-button:hover,
.title-screen .ranking-title-button:hover {
  border-color: #ff69b4 !important;
  color: #d93f8c !important;
  background: #fff7fb !important;
}



/* =========================================================
   ADMIN - 全投稿削除
========================================================= */
.admin-post-management {
  width: min(620px, 100%);
  margin: 24px auto 0;
  padding: 22px;
  border: 1px solid #efd5e1;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(90,45,65,0.07);
  text-align: center;
}

.admin-post-management h2 {
  margin: 0 0 7px;
  color: #302932;
}

.admin-post-management p {
  margin: 0 0 16px;
  color: #817983;
  font-size: 13px;
}

.admin-delete-all-button {
  width: min(360px, 100%);
  padding: 13px 18px;
  border: 1px solid #efb5ca;
  border-radius: 10px;
  background: #fff0f6;
  color: #c5367c;
  font-weight: 800;
  cursor: pointer;
}

.admin-delete-all-button:hover:not(:disabled) {
  background: #ff69b4;
  border-color: #ff69b4;
  color: #fff;
}

.admin-delete-all-button:disabled {
  opacity: .65;
  cursor: default;
}



/* =========================================================
   ADMIN - 個別投稿削除
========================================================= */
.admin-post-list {
  margin-top: 22px;
  text-align: left;
}

.admin-post-list h3 {
  margin: 0 0 12px;
  color: #302932;
  font-size: 17px;
}

.admin-post-items {
  display: grid;
  gap: 10px;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}

.admin-post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px 14px;
  border: 1px solid #eadde4;
  border-radius: 12px;
  background: #fffafc;
}

.admin-post-item-info {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.admin-post-item-info strong {
  color: #302932;
}

.admin-post-item-info span {
  color: #665d66;
  font-size: 13px;
}

.admin-post-item-info small {
  color: #948b94;
  font-size: 11px;
}

.admin-delete-post-button {
  flex-shrink: 0;
  padding: 9px 12px;
  border: 1px solid #efb5ca;
  border-radius: 9px;
  background: #fff0f6;
  color: #c5367c;
  font-weight: 800;
  cursor: pointer;
}

.admin-delete-post-button:hover:not(:disabled) {
  background: #ff69b4;
  border-color: #ff69b4;
  color: #fff;
}

.admin-delete-post-button:disabled {
  opacity: .65;
  cursor: default;
}

.admin-post-loading,
.admin-no-posts {
  padding: 20px;
  text-align: center;
  color: #817983;
  border: 1px solid #eadde4;
  border-radius: 12px;
  background: #fffafc;
}

@media (max-width: 600px) {
  .admin-post-item {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-delete-post-button {
    width: 100%;
  }
}

</style>
